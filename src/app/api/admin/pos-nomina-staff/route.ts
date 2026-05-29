import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// GET /api/admin/pos-nomina-staff — list staff from pos_nomina_staff
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const activo = searchParams.get('activo')

  let query = sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, correo')
    .order('nombre_completo')

  if (activo === 'true') {
    query = query.eq('activo', true)
  }

  const { data: staff, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ staff: staff || [] })
}