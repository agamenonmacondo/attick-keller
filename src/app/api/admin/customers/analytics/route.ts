import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'overview'

  try {
    if (view === 'overview') {
      // ── Overview: aggregate KPIs ──
      const [customersRes, statsRes] = await Promise.all([
        sb.from('customers').select('id, phone, email, created_at', { count: 'exact' }).eq('restaurant_id', RESTAURANT_ID),
        sb.from('customer_stats').select('total_visits, no_show_count, cancellations, total_party_size, avg_party_size, loyalty_tier, is_recurring, marketing_opt_in, last_visit_date, blacklisted'),
      ])

      const totalCustomers = customersRes.count || 0
      const stats = statsRes.data || []

      // Segment distribution
      const segments: Record<string, number> = {}
      let totalVisits = 0
      let totalNoShows = 0
      let totalCancellations = 0
      let totalPartySize = 0
      let marketingOptIn = 0
      let blacklisted = 0
      let recurring = 0

      for (const s of stats) {
        const tier = s.loyalty_tier || 'nuevo'
        segments[tier] = (segments[tier] || 0) + 1
        totalVisits += s.total_visits || 0
        totalNoShows += s.no_show_count || 0
        totalCancellations += s.cancellations || 0
        totalPartySize += s.total_party_size || 0
        if (s.marketing_opt_in) marketingOptIn++
        if (s.blacklisted) blacklisted++
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

      // Contact channel distribution
      const customers = customersRes.data || []
      const withPhone = customers.filter(c => c.phone).length
      const withEmail = customers.filter(c => c.email).length
      const withBoth = customers.filter(c => c.phone && c.email).length
      const withNeither = customers.filter(c => !c.phone && !c.email).length

      // Avg party size
      const avgPartySize = stats.length > 0
        ? Math.round((stats.reduce((sum: number, s: any) => sum + (s.avg_party_size || 0), 0) / stats.length) * 10) / 10
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
        totalCancellations,
        avgPartySize,
        marketingOptIn,
        blacklisted,
        recurring,
        withPhone,
        withEmail,
        withBoth,
        withNeither,
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
      const { data: stats, error } = await sb
        .from('customer_stats')
        .select('customer_id, total_visits, no_show_count, last_visit_date, is_recurring, loyalty_tier')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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