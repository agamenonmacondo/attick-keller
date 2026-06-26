import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { handleApiError } from '@/lib/utils/api-security'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('v_reservas_vs_ventas')
    .select('*')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  const rows = data || []
  const totalReservas = rows.reduce((s: number, r: any) => s + Number(r.num_reservas ?? 0), 0)
  const totalPax = rows.reduce((s: number, r: any) => s + Number(r.total_pax_reservado ?? 0), 0)
  const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.revenue_dia ?? 0), 0)
  const eventosGrandes = rows.filter((r: any) => Number(r.total_pax_reservado ?? 0) >= 15).length

  const summary = {
    total_reservas: totalReservas,
    total_pax: totalPax,
    total_revenue: totalRevenue,
    eventos_grandes: eventosGrandes,
  }

  return NextResponse.json({ data: rows, summary })
}