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
    .from('v_gaps_cobertura')
    .select('*')
    .neq('tipo_alerta', 'NORMAL')
    .order('hora', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const totalGaps = rows.filter((r: any) => r.tipo_alerta === 'GAP_COCINA').length
  const totalSobras = rows.filter((r: any) => r.tipo_alerta === 'SOBRA').length
  const areas = Array.from(new Set(rows.map((r: any) => r.area).filter(Boolean)))

  const summary = {
    total_gaps: totalGaps,
    total_sobras: totalSobras,
    areas_afectadas: areas,
  }

  return NextResponse.json({ data: rows, summary })
}
