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
    .from('v_productividad_area')
    .select('*')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []

  // Agrupar ROI por área
  const porArea = new Map<string, { roi: number; n: number }>()
  for (const r of rows) {
    const a = r.area ?? 'Sin área'
    const cur = porArea.get(a) ?? { roi: 0, n: 0 }
    cur.roi += Number(r.roi ?? 0)
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
    const prom = v.n > 0 ? v.roi / v.n : 0
    sumaROI += prom
    cuenta += 1
    if (prom > mejorROI) { mejorROI = prom; mejorArea = a }
    if (prom < peorROI) { peorROI = prom; peorArea = a }
  }

  const summary = {
    roi_promedio: cuenta > 0 ? sumaROI / cuenta : 0,
    mejor_area: mejorArea,
    peor_area: peorArea,
  }

  return NextResponse.json({ data: rows, summary })
}