import { NextRequest, NextResponse } from 'next/server'
import { getAdminOrLeaderUser, getServiceClient } from '@/lib/utils/admin-auth'

// GET /api/admin/staff/list-employees — list pos_nomina_staff for dropdown
// lider_area only sees their area
export async function GET(request: NextRequest) {
  const admin = await getAdminOrLeaderUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const requestedArea = searchParams.get('area')

  // lider_area can only see their own area
  const area = admin.role === 'lider_area' ? admin.area : requestedArea

  let query = sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area')
    .eq('activo', true)

  if (area) {
    query = query.or(`area.eq.${area},secondary_areas.cs.{${area}}`)
  }

  query = query.order('nombre_completo')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  return NextResponse.json({ employees: data || [] })
}