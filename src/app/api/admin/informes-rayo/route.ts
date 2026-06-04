import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const zone = searchParams.get('zone') || 'all'
  const category = searchParams.get('category') || 'all'
  const compareFrom = searchParams.get('compareFrom') || ''
  const compareTo = searchParams.get('compareTo') || ''

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const sb = getServiceClient()
  const rpcParams = { p_from: from, p_to: to, p_zone: zone, p_category: category }
  const topProductsParams = { p_from: from, p_to: to, p_limit: 15 }

  // ── Current period: parallel RPC calls ──
  const [
    kpiResult,
    dailyResult,
    zoneResult,
    staffResult,
    paymentsResult,
    clientSplitResult,
    topProductsResult,
  ] = await Promise.all([
    sb.rpc('pos_dashboard_kpis', rpcParams),
    sb.rpc('pos_dashboard_daily', { p_from: from, p_to: to, p_zone: zone, p_category: category, p_is_paid_only: false }),
    sb.rpc('pos_dashboard_by_zone', { p_from: from, p_to: to, p_category: category }),
    sb.rpc('pos_dashboard_staff', rpcParams),
    sb.rpc('pos_dashboard_payments', { p_from: from, p_to: to, p_category: category }),
    sb.rpc('pos_dashboard_client_split', rpcParams),
    sb.rpc('pos_dashboard_top_products', topProductsParams),
  ])

  if (kpiResult.error) {
    return NextResponse.json({ error: kpiResult.error.message }, { status: 500 })
  }

  // ── Normalize KPI field names ──
  // RPC returns: revenue, cheques, tip_total, party_size_total, ticket_promedio, etc.
  // Frontend expects: total_ventas, total_cheques, propina_total, personas, etc.
  const normalizeKpi = (kpi: any) => {
    if (!kpi) return null
    const raw = Array.isArray(kpi) ? kpi[0] : kpi
    if (!raw) return null
    return {
      total_ventas: raw.revenue ?? raw.total_ventas ?? 0,
      total_cheques: raw.cheques ?? raw.total_cheques ?? 0,
      propina_total: raw.tip_total ?? raw.propina_total ?? raw.propina ?? 0,
      personas: raw.party_size_total ?? raw.personas ?? raw.total_personas ?? 0,
      ticket_promedio: raw.ticket_promedio ?? raw.avg_ticket ?? 0,
      propina_promedio: raw.tip_promedio ?? raw.avg_tip ?? 0,
      personas_promedio: raw.party_size_promedio ?? raw.avg_party ?? 0,
      card_paid: raw.card_paid_total ?? 0,
      cash_paid: raw.cash_paid_total ?? 0,
      avg_service_time: raw.avg_service_time_min ?? 0,
    }
  }

  // ── Normalize zone fields ──
  const normalizeZones = (zones: any[]) => {
    if (!zones) return []
    return zones.map((z: any) => ({
      zone: z.zone ?? z.derived_zone_name ?? z.name ?? 'Desconocido',
      total_ventas: z.revenue ?? z.total_ventas ?? 0,
      total_cheques: z.cheques ?? z.total_cheques ?? 0,
      propina: z.tip_total ?? z.propina ?? 0,
      avg_service_time: z.avg_service_time_min ?? z.tiempo_promedio ?? 0,
      personas: z.party_size_total ?? z.personas ?? 0,
      ticket_promedio: z.cheques > 0 ? Math.round(z.revenue / z.cheques) : 0,
    }))
  }

  // ── Normalize payments ──
  const normalizePayments = (payments: any[]) => {
    if (!payments) return []
    return payments.map((p: any) => ({
      payment_method: p.method ?? p.payment_method ?? p.metodo ?? 'Otro',
      total: p.amount ?? p.total ?? p.total_ventas ?? 0,
      cheques: p.count ?? p.cheques ?? p.total_cheques ?? 0,
      pct: p.pct ?? p.porcentaje ?? 0,
    }))
  }

  // ── Normalize staff ──
  const normalizeStaff = (staff: any[]) => {
    if (!staff) return []
    return staff.map((s: any) => ({
      staff_name: s.staff_name ?? s.name ?? 'Sin nombre',
      total_ventas: s.revenue ?? s.total_ventas ?? 0,
      total_cheques: s.cheques ?? s.total_cheques ?? 0,
      total_propina: s.tip_total ?? s.propina ?? 0,
      ticket_promedio: s.ticket_promedio ?? (s.cheques > 0 ? Math.round(s.revenue / s.cheques) : 0),
    }))
  }

  // ── Normalize top products ──
  const normalizeProducts = (products: any[]) => {
    if (!products) return []
    return products.map((p: any) => ({
      product_id: p.product_id ?? '',
      product_name: p.product_name ?? p.name ?? 'Sin nombre',
      category_id: p.category_id ?? p.pos_group_id ?? '',
      category_name: p.category_name ?? p.group_name ?? 'Sin categoría',
      quantity: p.quantity ?? 0,
      revenue: p.revenue ?? p.total_ventas ?? 0,
    }))
  }

  // ── Comparison period (optional) ──
  let comparisonData = null
  if (compareFrom && compareTo) {
    const compareParams = { p_from: compareFrom, p_to: compareTo, p_zone: zone, p_category: category }
    const [kpiComp] = await Promise.all([
      sb.rpc('pos_dashboard_kpis', compareParams),
    ])
    comparisonData = { kpis: normalizeKpi(kpiComp.data) }
  }

  return NextResponse.json({
    kpis: normalizeKpi(kpiResult.data),
    daily: dailyResult.data || [],
    zones: normalizeZones(zoneResult.data || []),
    staff: normalizeStaff(staffResult.data || []),
    payments: normalizePayments(paymentsResult.data || []),
    clientSplit: clientSplitResult.data || [],
    topProducts: normalizeProducts(topProductsResult.data || []),
    comparison: comparisonData,
    period: { from, to, zone, compareFrom, compareTo },
  })
}