import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const zone = searchParams.get('zone') || 'all'
  const compareFrom = searchParams.get('compareFrom') || ''
  const compareTo = searchParams.get('compareTo') || ''

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const sb = getServiceClient()
  const rpcParams = { p_from: from, p_to: to, p_zone: zone, p_category: 'all' }

  // ── Current period: parallel RPC calls ──
  const [
    kpiResult,
    dailyResult,
    zoneResult,
    staffResult,
    paymentsResult,
    clientSplitResult,
  ] = await Promise.all([
    sb.rpc('pos_dashboard_kpis', rpcParams),
    sb.rpc('pos_dashboard_daily', rpcParams),
    sb.rpc('pos_dashboard_by_zone', rpcParams),
    sb.rpc('pos_dashboard_staff', rpcParams),
    sb.rpc('pos_dashboard_payments', rpcParams),
    sb.rpc('pos_dashboard_client_split', rpcParams),
  ])

  if (kpiResult.error) {
    return NextResponse.json({ error: kpiResult.error.message }, { status: 500 })
  }

  // ── Comparison period (optional) ──
  let comparisonData = null
  if (compareFrom && compareTo) {
    const compareParams = { p_from: compareFrom, p_to: compareTo, p_zone: zone, p_category: 'all' }
    const [kpiComp] = await Promise.all([
      sb.rpc('pos_dashboard_kpis', compareParams),
    ])
    comparisonData = { kpis: kpiComp.data }
  }

  return NextResponse.json({
    kpis: kpiResult.data,
    daily: dailyResult.data || [],
    zones: zoneResult.data || [],
    staff: staffResult.data || [],
    payments: paymentsResult.data || [],
    clientSplit: clientSplitResult.data || [],
    comparison: comparisonData,
    period: { from, to, zone, compareFrom, compareTo },
  })
}