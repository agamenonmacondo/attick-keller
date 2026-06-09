import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const zone = searchParams.get('zone') || 'all'

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  try {
    const sb = getServiceClient()
    const { data, error } = await sb.rpc('pos_dashboard_product_hourly', {
      p_from: from,
      p_to: to,
      p_zone: zone,
    })

    if (error) {
      console.error('[ProductoHourly] RPC error:', error)
      return NextResponse.json({ error: 'Error fetching product hourly data' }, { status: 500 })
    }

    return NextResponse.json({
      productos: data || [],
      period: { from, to, zone },
    })
  } catch (err: any) {
    console.error('[ProductoHourly] Error:', err)
    return NextResponse.json({ error: err.message || 'Error fetching product hourly data' }, { status: 500 })
  }
}
