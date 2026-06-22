import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

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
    .from('v_revenue_vs_turnos_hora')
    .select('*')
    .order('hora', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.total_revenue ?? 0), 0)
  const totalPersonas = rows.reduce((s: number, r: any) => s + Number(r.personas_trabajando ?? 0), 0)

  let horaPico: string | number = ''
  let maxRev = -1
  for (const r of rows) {
    const rev = Number(r.total_revenue ?? 0)
    if (rev > maxRev) { maxRev = rev; horaPico = r.hora }
  }

  const summary = {
    total_revenue: totalRevenue,
    promedio_personas: rows.length > 0 ? totalPersonas / rows.length : 0,
    hora_pico: horaPico,
  }

  return NextResponse.json({ data: rows, summary })
}
