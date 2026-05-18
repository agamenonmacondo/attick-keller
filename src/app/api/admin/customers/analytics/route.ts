import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// ── Helper: get exact count from Supabase ──
async function getCount(sb: any, table: string, filter?: { column: string; value: string }): Promise<number> {
  let query = sb.from(table).select('id', { count: 'exact', head: true })
  if (filter) query = query.eq(filter.column, filter.value)
  const { count, error } = await query
  if (error) throw error
  return count || 0
}

// ── Helper: fetch all rows from Supabase with pagination ──
async function fetchAll<T>(
  sb: any,
  table: string,
  select: string,
  filter?: { column: string; value: string },
  batchSize = 2000
): Promise<T[]> {
  const allRows: T[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = sb
      .from(table)
      .select(select)
      .range(offset, offset + batchSize - 1)

    if (filter) {
      query = query.eq(filter.column, filter.value)
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...data)
    hasMore = data.length === batchSize
    offset += batchSize
  }

  return allRows
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'overview'

  try {
    if (view === 'overview') {
      // ── Use counts + stats only (no need to fetch ALL 20K customers) ──
      // Get total customer count (efficient)
      const totalCustomers = await getCount(sb, 'customers', { column: 'restaurant_id', value: RESTAURANT_ID })

      // Fetch ALL stats (they have the aggregate data we need)
      const stats = await fetchAll<any>(sb, 'customer_stats', 'customer_id, total_visits, no_show_count, loyalty_tier, is_recurring, last_visit_date, total_spent')

      // Contact channel distribution — use Supabase count queries instead of fetching all customers
      const [withPhoneCount, withEmailCount, withBothCount] = await Promise.all([
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('phone', 'is', null).neq('phone', ''),
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('email', 'is', null).neq('email', ''),
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('phone', 'is', null).neq('phone', '').not('email', 'is', null).neq('email', ''),
      ])

      const withPhone = withPhoneCount.count || 0
      const withEmail = withEmailCount.count || 0
      const withBoth = withBothCount.count || 0
      const withNeither = totalCustomers - withPhone - withEmail + withBoth // inclusion-exclusion

      // Aggregate from stats
      const segments: Record<string, number> = {}
      let totalVisits = 0
      let totalNoShows = 0
      let totalSpent = 0
      let recurring = 0

      for (const s of stats) {
        const tier = s.loyalty_tier || 'none'
        segments[tier] = (segments[tier] || 0) + 1
        totalVisits += s.total_visits || 0
        totalNoShows += s.no_show_count || 0
        totalSpent += s.total_spent || 0
        if (s.is_recurring) recurring++
      }

      // Retention funnel
      const oneTime = stats.filter(s => (s.total_visits || 0) <= 1).length
      const twoToThree = stats.filter(s => (s.total_visits || 0) >= 2 && (s.total_visits || 0) <= 3).length
      const fourToFive = stats.filter(s => (s.total_visits || 0) >= 4 && (s.total_visits || 0) <= 5).length
      const sixToTen = stats.filter(s => (s.total_visits || 0) >= 6 && (s.total_visits || 0) <= 10).length
      const vip = stats.filter(s => (s.total_visits || 0) >= 11).length

      // No-show risk distribution
      const noRisk = stats.filter(s => (s.no_show_count || 0) === 0).length
      const lowRisk = stats.filter(s => (s.no_show_count || 0) === 1).length
      const medRisk = stats.filter(s => (s.no_show_count || 0) >= 2 && (s.no_show_count || 0) <= 3).length
      const highRisk = stats.filter(s => (s.no_show_count || 0) >= 4).length

      // High-risk clients (top 20 by no-show count)
      const highRiskClients = stats
        .filter(s => (s.no_show_count || 0) >= 2)
        .sort((a: any, b: any) => (b.no_show_count || 0) - (a.no_show_count || 0))
        .slice(0, 20)

      // VIP clients (top 20 by total_visits)
      const vipClients = stats
        .sort((a: any, b: any) => (b.total_visits || 0) - (a.total_visits || 0))
        .slice(0, 20)

      // Avg spend per visit
      const avgSpendPerVisit = totalVisits > 0
        ? Math.round((totalSpent / totalVisits) * 100) / 100
        : 0

      // Recency: last visit buckets
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
      const recent30 = stats.filter(s => s.last_visit_date && s.last_visit_date >= thirtyDaysAgo).length
      const recent90 = stats.filter(s => s.last_visit_date && s.last_visit_date >= ninetyDaysAgo).length

      return NextResponse.json({
        totalCustomers,
        totalVisits,
        totalNoShows,
        totalSpent,
        avgSpendPerVisit,
        recurring,
        withPhone,
        withEmail,
        withBoth,
        withNeither: Math.max(0, withNeither),
        recent30,
        recent90,
        segments,
        retention: {
          oneTime, twoToThree, fourToFive, sixToTen, vip,
        },
        noShowRisk: {
          noRisk, lowRisk, medRisk, highRisk,
        },
        highRiskClients,
        vipClients,
      })
    }

    if (view === 'retention') {
      // ── Detailed retention data ──
      const stats = await fetchAll<any>(
        sb,
        'customer_stats',
        'customer_id, total_visits, no_show_count, last_visit_date, is_recurring, loyalty_tier'
      )

      // Build visit frequency histogram
      const visitCounts: Record<number, number> = {}
      for (const s of stats || []) {
        const v = s.total_visits || 0
        visitCounts[v] = (visitCounts[v] || 0) + 1
      }

      // Monthly cohort-like: customers by last_visit_date month
      const monthlyActive: Record<string, number> = {}
      for (const s of stats || []) {
        if (s.last_visit_date) {
          const month = s.last_visit_date.substring(0, 7)
          monthlyActive[month] = (monthlyActive[month] || 0) + 1
        }
      }

      return NextResponse.json({ visitCounts, monthlyActive, total: stats?.length || 0 })
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })

  } catch (err) {
    console.error('[analytics] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}