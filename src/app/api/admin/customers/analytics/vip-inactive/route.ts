import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30', 10)

  try {
    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]

    // Get VIP stats where last_visit_date < cutoff
    const { data: vipStats, error: statsError } = await sb
      .from('customer_stats')
      .select('customer_id, total_visits, last_visit_date, loyalty_tier')
      .eq('loyalty_tier', 'vip')
      .lt('last_visit_date', cutoffStr)

    if (statsError) throw statsError

    // Get total VIP count
    const { count: totalVIPs } = await sb
      .from('customer_stats')
      .select('id', { count: 'exact', head: true })
      .eq('loyalty_tier', 'vip')

    if (!vipStats || vipStats.length === 0) {
      return NextResponse.json({
        vipInactive: [],
        count: 0,
        totalVIPs: totalVIPs || 0,
      })
    }

    // Get customer names and phones
    const vipIds = vipStats.map((s: any) => s.customer_id)
    const customerMap: Record<string, { name: string; phone: string | null }> = {}

    for (let i = 0; i < vipIds.length; i += 999) {
      const batch = vipIds.slice(i, i + 999)
      const { data: customers } = await sb
        .from('customers')
        .select('id, full_name, phone')
        .in('id', batch)

      for (const c of customers || []) {
        customerMap[c.id] = { name: c.full_name || 'Sin nombre', phone: c.phone }
      }
    }

    // Build response
    const vipInactive = vipStats
      .map((s: any) => {
        const customer = customerMap[s.customer_id] || { name: 'Sin nombre', phone: null }
        const lastVisit = s.last_visit_date ? new Date(s.last_visit_date) : null
        const daysSince = lastVisit
          ? Math.floor((Date.now() - lastVisit.getTime()) / 86400000)
          : 999

        return {
          id: s.customer_id,
          customerName: customer.name,
          phone: customer.phone,
          lastVisitDate: s.last_visit_date,
          totalVisits: s.total_visits || 0,
          daysSinceLastVisit: daysSince,
          loyaltyTier: s.loyalty_tier,
        }
      })
      .sort((a: any, b: any) => b.daysSinceLastVisit - a.daysSinceLastVisit)

    return NextResponse.json({
      vipInactive,
      count: vipInactive.length,
      totalVIPs: totalVIPs || 0,
    })
  } catch (err) {
    console.error('[vip-inactive] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}