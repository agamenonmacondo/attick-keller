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
    .from('nomina_he_recargos')
    .select('*, pos_nomina_staff(nombre_completo, cargo, cedula)')
    .eq('periodo_id', periodoId)
    .eq('sede', sede)
    .order('total_recargos', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const flatData = (data || []).map((d: any) => ({
    ...d,
    nombre_completo: d.pos_nomina_staff?.nombre_completo || 'Desconocido',
    cargo: d.pos_nomina_staff?.cargo || '',
    cedula: d.pos_nomina_staff?.cedula || '',
  }))

  const totals = {
    hed_total: flatData.reduce((s: number, d: any) => s + (Number(d.hed_total) || 0), 0),
    hen_total: flatData.reduce((s: number, d: any) => s + (Number(d.hen_total) || 0), 0),
    rn_total: flatData.reduce((s: number, d: any) => s + (Number(d.rn_total) || 0), 0),
    rd_diurno_total: flatData.reduce((s: number, d: any) => s + (Number(d.rd_diurno_total) || 0), 0),
    rd_nocturno_total: flatData.reduce((s: number, d: any) => s + (Number(d.rd_nocturno_total) || 0), 0),
    hedd_total: flatData.reduce((s: number, d: any) => s + (Number(d.hedd_total) || 0), 0),
    hddn_total: flatData.reduce((s: number, d: any) => s + (Number(d.hddn_total) || 0), 0),
    total_recargos: flatData.reduce((s: number, d: any) => s + (Number(d.total_recargos) || 0), 0),
  }

  return NextResponse.json({ data: flatData, totals })
}