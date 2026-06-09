import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// GET /api/admin/staff/list-employees — list pos_nomina_staff for dropdown
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()

  const { data, error } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area')
    .eq('activo', true)
    .order('nombre_completo')

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  return NextResponse.json({ employees: data || [] })
}