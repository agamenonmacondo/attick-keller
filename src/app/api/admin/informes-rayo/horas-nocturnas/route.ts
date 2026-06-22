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
    .from('v_horas_nocturnas')
    .select('*')
    .order('dia_semana', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const totalNocturnas = rows.reduce((s: number, r: any) => s + Number(r.horas_nocturnas ?? 0), 0)
  const totalRecargo = rows.reduce((s: number, r: any) => s + Number(r.recargo_35pct ?? 0), 0)

  const porArea = new Map<string, number>()
  for (const r of rows) {
    const a = r.area ?? 'Sin área'
    porArea.set(a, (porArea.get(a) ?? 0) + Number(r.horas_nocturnas ?? 0))
  }
  let areaMasNocturna = ''
  let maxHoras = -1
  for (const [a, h] of porArea) {
    if (h > maxHoras) { maxHoras = h; areaMasNocturna = a }
  }

  const summary = {
    total_nocturnas: totalNocturnas,
    total_recargo: totalRecargo,
    area_mas_nocturna: areaMasNocturna,
  }

  return NextResponse.json({ data: rows, summary })
}
