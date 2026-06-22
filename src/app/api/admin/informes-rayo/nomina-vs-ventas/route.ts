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
    .from('v_nomina_vs_ventas')
    .select('*')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const summary = {
    nomina_total: rows.reduce((s: number, r: any) => s + Number(r.nomina_total ?? 0), 0),
    ventas_total: rows.reduce((s: number, r: any) => s + Number(r.total_ventas ?? 0), 0),
    dias: rows.length,
  }

  return NextResponse.json({ data: rows, summary })
}