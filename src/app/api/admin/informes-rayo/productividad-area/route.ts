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
  // v_productividad_area has dia_semana (int 0-6), not a date string
  // Return all rows — the component aggregates by area
  const { data, error } = await sb
    .from('v_productividad_area')
    .select('*')
    .order('area', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []

  // Agrupar ROI por área
  const porArea = new Map<string, { revenue: number; horas: number; costo: number; n: number }>()
  for (const r of rows) {
    const a = r.area ?? 'Sin área'
    const cur = porArea.get(a) ?? { revenue: 0, horas: 0, costo: 0, n: 0 }
    cur.revenue += Number(r.revenue_del_area ?? 0)
    cur.horas += Number(r.horas_trabajadas ?? 0)
    cur.costo += Number(r.costo_nomina ?? 0)
    cur.n += 1
    porArea.set(a, cur)
  }

  let mejorArea = ''
  let peorArea = ''
  let mejorROI = -Infinity
  let peorROI = Infinity
  let sumaROI = 0
  let cuenta = 0
  for (const [a, v] of porArea) {
    const roi = v.costo > 0 ? v.revenue / v.costo : 0
    sumaROI += roi
    cuenta += 1
    if (roi > mejorROI) { mejorROI = roi; mejorArea = a }
    if (roi < peorROI) { peorROI = roi; peorArea = a }
  }

  const summary = {
    roi_promedio: cuenta > 0 ? sumaROI / cuenta : 0,
    mejor_area: mejorArea,
    peor_area: peorArea,
  }

  return NextResponse.json({ data: rows, summary })
}