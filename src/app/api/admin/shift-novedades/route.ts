import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// POST /api/admin/shift-novedades — reportar contingencia
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

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
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  return NextResponse.json(data, { status: 201 })
}

// Helper: obtener day_index desde fecha
function getDayIndexFromDate(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() // 0=Dom, 1=Lun, ... 6=Sab
}