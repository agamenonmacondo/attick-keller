import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getEmployeeUser, getServiceClient } from '@/lib/utils/admin-auth'
import { sendShiftCheckoutEmail } from '@/lib/email/send'

// POST /api/admin/shift-checkout
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  const employee = !admin ? await getEmployeeUser(request) : null

  if (!admin && !employee) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sb = getServiceClient()
  const body = await request.json()
  const { assignment_id, location } = body

  if (!assignment_id) {
    return NextResponse.json({ error: 'assignment_id es requerido' }, { status: 400 })
  }

  // Obtener pos_nomina_staff_id
  let employeeId: string
  if (employee) {
    employeeId = employee.pos_nomina_staff_id
  } else {
    // Priorizar rol colaborador/lider_area sobre super_admin/store_admin
    const { data: userRoles } = await sb
      .from('user_roles')
      .select('role, pos_nomina_staff_id')
      .eq('auth_user_id', admin!.id)
    const employeeRole = (userRoles || []).find((r: { role: string }) =>
      r.role === 'colaborador' || r.role === 'lider_area'
    )
    const fallbackRole = (userRoles || []).find((r: { role: string }) => r.role === 'super_admin' || r.role === 'store_admin')
    const targetRole = employeeRole || fallbackRole
    employeeId = targetRole?.pos_nomina_staff_id
    if (!employeeId) {
      return NextResponse.json({ error: 'Perfil de colaborador no encontrado' }, { status: 404 })
    }
  }

  // Verificar
  const { data: assignment } = await sb
    .from('shift_assignments')
    .select('employee_id, checkin_at, schedule_id, shift_code, day_index')
    .eq('id', assignment_id)
    .single()

  if (!assignment || assignment.employee_id !== employeeId) {
    return NextResponse.json({ error: 'Asignacion no encontrada' }, { status: 403 })
  }

  if (!assignment.checkin_at) {
    return NextResponse.json({ error: 'Debe hacer check-in primero' }, { status: 400 })
  }

  // Registrar checkout
  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('shift_assignments')
    .update({
      checkout_at: now,
      checkout_location: location || null,
    })
    .eq('id', assignment_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Registrar en novedades
  await sb.from('shift_novedades').insert({
    employee_id: employeeId,
    date: now.split('T')[0],
    type: 'checkout',
    checkout_at: now,
    location: location || null,
  })

  // Enviar correo de confirmacion de checkout (fire-and-forget)
  try {
    await sendShiftCheckoutEmail(assignment.schedule_id, assignment.shift_code, assignment.day_index, employeeId, sb)
  } catch (emailErr) {
    console.error('[email] Error sending checkout email:', emailErr)
  }

  return NextResponse.json(data)
}