import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id: periodoId } = await params
  const sede = request.nextUrl.searchParams.get('sede') || 'C75'

  const sb = getServiceClient()

  const { data, error } = await sb
    .from('nomina_provisiones')
    .select('*, pos_nomina_staff(nombre_completo, cargo, cedula)')
    .eq('periodo_id', periodoId)
    .eq('sede', sede)
    .order('total_provision_empleador', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flatData = (data || []).map((d: any) => ({
    ...d,
    nombre_completo: d.pos_nomina_staff?.nombre_completo || 'Desconocido',
    cargo: d.pos_nomina_staff?.cargo || '',
    cedula: d.pos_nomina_staff?.cedula || '',
  }))

  const totalFields = [
    'provisiones_salud', 'provisiones_sociales', 'base_vacaciones',
    'salud_empleado', 'pension_empleado', 'pension_empleador',
    'arl_empleador', 'caja_empleador', 'cesantias_empleador',
    'prima_empleador', 'vacaciones_empleador', 'intereses_cesantias_empleador',
    'total_provision_empleador',
  ]

  const totals: Record<string, number> = {}
  for (const f of totalFields) {
    totals[f] = flatData.reduce((s: number, d: any) => s + (Number(d[f]) || 0), 0)
  }

  return NextResponse.json({ data: flatData, totals })
}