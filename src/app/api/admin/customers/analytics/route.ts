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
      // ── Strategy 1: Try RPC function (single query, instant) ──
      try {
        const { data: rpcData, error: rpcErr } = await sb
          .rpc('get_analytics_overview', { p_restaurant_id: RESTAURANT_ID })

        if (!rpcErr && rpcData) {
          // RPC succeeded — also get reactivation contacts
          const { data: reactData } = await sb
            .rpc('get_reactivation_contacts', { p_restaurant_id: RESTAURANT_ID })

          const stats = rpcData.stats || {}
          const reactivation = reactData || stats.reactivation || {}

          return NextResponse.json({
            totalCustomers: rpcData.totalCustomers || 0,
            totalVisits: stats.totalVisits || 0,
            totalNoShows: stats.totalNoShows || 0,
            totalSpent: stats.totalSpent || 0,
            avgSpendPerVisit: (stats.totalVisits || 0) > 0
              ? Math.round(((stats.totalSpent || 0) / stats.totalVisits) * 100) / 100
              : 0,
            recurring: stats.recurring || 0,
            withPhone: rpcData.withPhone || 0,
            withEmail: rpcData.withEmail || 0,
            withBoth: rpcData.withBoth || 0,
            withNeither: rpcData.withNeither || 0,
            recent30: stats.recent30 || 0,
            recent90: stats.recent90 || 0,
            segments: stats.segments || {},
            retention: stats.retention || { oneTime: 0, twoToThree: 0, fourToFive: 0, sixToTen: 0, vip: 0 },
            noShowRisk: stats.noShowRisk || { noRisk: 0, lowRisk: 0, medRisk: 0, highRisk: 0 },
            highRiskClients: stats.highRiskClients || [],
            vipClients: stats.vipClients || [],
            reactivation: {
              dormantClients: reactivation.dormantClients || 0,
              reachableWhatsApp: reactivation.reachableWhatsApp || 0,
              reachableEmail: reactivation.reachableEmail || 0,
              notReachable: reactivation.notReachable || 0,
            },
          })
        }
        // RPC not found or error — fall through to fallback
        console.log('[analytics] RPC not available, using fallback:', rpcErr?.message)
      } catch {
        // Function doesn't exist yet — fall through
      }

      // ── Strategy 2: Fallback — aggregate counts via targeted queries (no fetchAll) ──
      // Use JOIN-friendly approach: get counts by querying customer_stats
      // filtered through customer IDs in batches, but only the minimal data needed

      // Quick counts (head:true, no data transfer)
      const [totalRes, phoneRes, emailRes, bothRes] = await Promise.all([
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('phone', 'is', null).neq('phone', ''),
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('email', 'is', null).neq('email', ''),
        sb.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID).not('phone', 'is', null).neq('phone', '').not('email', 'is', null).neq('email', ''),
      ])

      const totalCustomers = totalRes.count || 0
      const withPhone = phoneRes.count || 0
      const withEmail = emailRes.count || 0
      const withBoth = bothRes.count || 0
      const withNeither = Math.max(0, totalCustomers - withPhone - withEmail + withBoth)

      // Aggregate stats — fetch ONLY small numeric fields, all in parallel batches of 5
      const allStats: any[] = []
      const { count: statsCount } = await sb
        .from('customer_stats')
        .select('customer_id', { count: 'exact', head: true })

      const batchSize = 999
      const totalStatsBatches = Math.ceil((statsCount || 0) / batchSize)
      const parallelChunks = 5

      for (let group = 0; group < totalStatsBatches; group += parallelChunks) {
        const promises = []
        for (let b = group; b < Math.min(group + parallelChunks, totalStatsBatches); b++) {
          promises.push(
            sb
              .from('customer_stats')
              .select('customer_id, total_visits, no_show_count, loyalty_tier, is_recurring, last_visit_date, total_spent')
              .range(b * batchSize, b * batchSize + batchSize)
              .then(({ data, error }: any) => {
                if (error) throw error
                return data || []
              })
          )
        }
        const results = await Promise.all(promises)
        for (const rows of results) allStats.push(...rows)
      }

      // Filter to this restaurant
      const restaurantIds = new Set<string>()
      const totalIdBatches = Math.ceil(totalCustomers / batchSize)
      for (let group = 0; group < totalIdBatches; group += parallelChunks) {
        const promises = []
        for (let b = group; b < Math.min(group + parallelChunks, totalIdBatches); b++) {
          promises.push(
            sb
              .from('customers')
              .select('id')
              .eq('restaurant_id', RESTAURANT_ID)
              .range(b * batchSize, b * batchSize + batchSize)
              .then(({ data, error }: any) => {
                if (error) throw error
                return data || []
              })
          )
        }
        const results = await Promise.all(promises)
        for (const rows of results) for (const r of rows) restaurantIds.add(r.id)
      }

      const stats = allStats.filter((s: any) => restaurantIds.has(s.customer_id))

      // Aggregate
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

      const oneTime = stats.filter(s => (s.total_visits || 0) <= 1).length
      const twoToThree = stats.filter(s => (s.total_visits || 0) >= 2 && (s.total_visits || 0) <= 3).length
      const fourToFive = stats.filter(s => (s.total_visits || 0) >= 4 && (s.total_visits || 0) <= 5).length
      const sixToTen = stats.filter(s => (s.total_visits || 0) >= 6 && (s.total_visits || 0) <= 10).length
      const vip = stats.filter(s => (s.total_visits || 0) >= 11).length

      const noRisk = stats.filter(s => (s.no_show_count || 0) === 0).length
      const lowRisk = stats.filter(s => (s.no_show_count || 0) === 1).length
      const medRisk = stats.filter(s => (s.no_show_count || 0) >= 2 && (s.no_show_count || 0) <= 3).length
      const highRisk = stats.filter(s => (s.no_show_count || 0) >= 4).length

      const highRiskClients = stats
        .filter(s => (s.no_show_count || 0) >= 2)
        .sort((a: any, b: any) => (b.no_show_count || 0) - (a.no_show_count || 0))
        .slice(0, 20)

      const vipClients = stats
        .sort((a: any, b: any) => (b.total_visits || 0) - (a.total_visits || 0))
        .slice(0, 20)

      const avgSpendPerVisit = totalVisits > 0
        ? Math.round((totalSpent / totalVisits) * 100) / 100
        : 0

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
      const recent30 = stats.filter(s => s.last_visit_date && s.last_visit_date >= thirtyDaysAgo).length
      const recent90 = stats.filter(s => s.last_visit_date && s.last_visit_date >= ninetyDaysAgo).length

      // Reactivation
      const dormantIds = stats.filter(s => (s.total_visits || 0) <= 1).map(s => s.customer_id)
      let reachableWhatsApp = 0
      let reachableEmail = 0
      let notReachable = 0

      for (let i = 0; i < dormantIds.length; i += 999) {
        const batch = dormantIds.slice(i, i + 999)
        const { data: dormantCustomers } = await sb
          .from('customers')
          .select('phone, email')
          .in('id', batch)
          .eq('restaurant_id', RESTAURANT_ID)

        for (const c of dormantCustomers || []) {
          const hasPhone = c.phone && c.phone.trim() !== ''
          const hasEmail = c.email && c.email.trim() !== ''
          if (hasPhone) reachableWhatsApp++
          if (hasEmail) reachableEmail++
          if (!hasPhone && !hasEmail) notReachable++
        }
      }

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
        withNeither,
        recent30,
        recent90,
        segments,
        retention: { oneTime, twoToThree, fourToFive, sixToTen, vip },
        noShowRisk: { noRisk, lowRisk, medRisk, highRisk },
        highRiskClients,
        vipClients,
        reactivation: {
          dormantClients: dormantIds.length,
          reachableWhatsApp,
          reachableEmail,
          notReachable,
        },
      })
    }

    if (view === 'retention') {
      return NextResponse.json({
        visitCounts: {},
        monthlyActive: {},
        total: 0,
        message: 'Use view=overview for retention data',
      })
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })

  } catch (err) {
    console.error('[analytics] Error:', err)
    return NextResponse.json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}