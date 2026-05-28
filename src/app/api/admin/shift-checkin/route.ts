import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// POST /api/admin/shift-checkin
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { assignment_id, location } = body

  if (!assignment_id) {
    return NextResponse.json({ error: 'assignment_id es requerido' }, { status: 400 })
  }

  // Obtener pos_nomina_staff_id
  const { data: userRole } = await sb
    .from('user_roles')
    .select('pos_nomina_staff_id')
    .eq('auth_user_id', admin.id)
    .single()

  const employeeId = userRole?.pos_nomina_staff_id
  if (!employeeId) {
    return NextResponse.json({ error: 'Perfil de colaborador no encontrado' }, { status: 404 })
  }

  // Verificar que la asignacion pertenece al empleado
  const { data: assignment } = await sb
    .from('shift_assignments')
    .select('employee_id')
    .eq('id', assignment_id)
    .single()

  if (!assignment || assignment.employee_id !== employeeId) {
    return NextResponse.json({ error: 'Asignacion no encontrada o no pertenece al usuario' }, { status: 403 })
  }

  // Registrar checkin
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('shift_assignments')
    .update({
      checkin_at: now,
      checkin_location: location || null,
    })
    .eq('id', assignment_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Registrar en novedades tambien
  await sb.from('shift_novedades').insert({
    employee_id: employeeId,
    date: now.split('T')[0],
    type: 'checkin',
    checkin_at: now,
    location: location || null,
  })

  return NextResponse.json(data)
}