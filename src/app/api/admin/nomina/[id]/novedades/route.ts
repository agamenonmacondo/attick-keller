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
    .from('nomina_novedades')
    .select('*, pos_nomina_staff(nombre_completo, cargo, cedula)')
    .eq('periodo_id', periodoId)
    .eq('sede', sede)
    .order('tipo')

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  const flatData = (data || []).map((d: any) => ({
    ...d,
    nombre_completo: d.pos_nomina_staff?.nombre_completo || 'Desconocido',
    cargo: d.pos_nomina_staff?.cargo || '',
    cedula: d.pos_nomina_staff?.cedula || '',
  }))

  return NextResponse.json({ data: flatData })
}