import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getEmployeeUser, getServiceClient } from '@/lib/utils/admin-auth'
import { sendShiftNovedadEmail } from '@/lib/email/send'

// POST /api/admin/shift-novedades — reportar contingencia
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  const employee = !admin ? await getEmployeeUser(request) : null

  if (!admin && !employee) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sb = getServiceClient()
  const body = await request.json()
  const { schedule_id, type, date, description } = body

  if (!type || !date) {
    return NextResponse.json({ error: 'type y date son requeridos' }, { status: 400 })
  }

  const validTypes = ['falta', 'tarde', 'permiso', 'incapacidad']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Tipo invalido. Use: ${validTypes.join(', ')}` }, { status: 400 })
  }

  // Validacion: minimo 24hrs de anticipacion para permisos y faltas
  // Solo empleados (no admins) deben cumplir esta regla
  if (!admin) {
    const fechaTurno = new Date(date + 'T00:00:00')
    const ahora = new Date()
    const horasAnticipacion = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60)

    if (horasAnticipacion < 24) {
      return NextResponse.json(
        { error: 'Las novedades deben reportarse con al menos 24 horas de anticipacion. Contacta a tu lider de area para casos urgentes.' },
        { status: 400 }
      )
    }
  }

  // Obtener pos_nomina_staff_id
  let employeeId: string
  if (employee) {
    employeeId = employee.pos_nomina_staff_id
  } else {
    // Admin puede reportar por un empleado — necesita employee_id en el body
    const bodyEmployeeId = body.employee_id
    if (!bodyEmployeeId) {
      return NextResponse.json({ error: 'Admin debe especificar employee_id' }, { status: 400 })
    }
    employeeId = bodyEmployeeId
  }

  // Insertar novedad
  const { data, error } = await sb
    .from('shift_novedades')
    .insert({
      employee_id: employeeId,
      schedule_id: schedule_id || null,
      date,
      type,
      description: description || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Actualizar asignacion si existe
  if (schedule_id) {
    await sb
      .from('shift_assignments')
      .update({ novedad: type === 'falta' ? 'incapacidad' : type === 'tarde' ? 'permiso' : type })
      .eq('schedule_id', schedule_id)
      .eq('employee_id', employeeId)
      .filter('day_index', 'eq', getDayIndexFromDate(date))
  }

  // Enviar correo de novedad al lider de area (fire-and-forget)
  try {
    await sendShiftNovedadEmail(employeeId, type, date, description, schedule_id, sb)
  } catch (emailErr) {
    console.error('[email] Error sending novedad email:', emailErr)
  }

  return NextResponse.json(data, { status: 201 })
}

// Helper: obtener day_index desde fecha
function getDayIndexFromDate(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() // 0=Dom, 1=Lun, ... 6=Sab
}