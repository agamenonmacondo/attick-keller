import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getEmployeeUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/shift-my-week?week_str=2026-W23
// Obtiene la semana del colaborador autenticado
export async function GET(request: NextRequest) {
  // Aceptar admin (para ver desde admin) o empleado (colaborador/lider_area)
  const admin = await getAdminUser(request)
  const employee = !admin ? await getEmployeeUser(request) : null

  if (!admin && !employee) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const week_str = searchParams.get('week_str')

  if (!week_str) {
    return NextResponse.json({ error: 'week_str es requerido' }, { status: 400 })
  }

  // Obtener pos_nomina_staff_id
  let employeeId: string
  if (employee) {
    employeeId = employee.pos_nomina_staff_id
  } else {
    // Admin puede solicitar por query param
    const queryEmployeeId = searchParams.get('employee_id')
    if (queryEmployeeId) {
      employeeId = queryEmployeeId
    } else {
      const { data: userRole } = await sb
        .from('user_roles')
        .select('pos_nomina_staff_id')
        .eq('auth_user_id', admin!.id)
        .single()
      employeeId = userRole?.pos_nomina_staff_id
      if (!employeeId) {
        return NextResponse.json({ error: 'Perfil de colaborador no encontrado' }, { status: 404 })
      }
    }
  }

  // Obtener datos del empleado
  const { data: employeeData, error: empError } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, salario')
    .eq('id', employeeId)
    .single()

  if (empError || !employeeData) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
  }

  // Obtener alias
  const { data: aliasData } = await sb
    .from('staff_aliases')
    .select('alias')
    .eq('employee_id', employeeId)
    .limit(1)

  const alias = aliasData?.[0]?.alias || (employeeData.nombre_completo as string).split(' ')[0]

  // Buscar cronograma publicado del area
  const { data: schedule } = await sb
    .from('shift_schedules')
    .select('id, week_str, status')
    .eq('area', employeeData.area)
    .eq('week_str', week_str)
    .eq('status', 'published')
    .maybeSingle()

  if (!schedule) {
    return NextResponse.json({
      employee: { ...employeeData, alias },
      schedule: null,
      assignments: [],
    })
  }

  // Obtener asignaciones del empleado
  const { data: assignments } = await sb
    .from('shift_assignments')
    .select('*')
    .eq('schedule_id', schedule.id)
    .eq('employee_id', employeeId)

  return NextResponse.json({
    employee: { ...employeeData, alias },
    schedule,
    assignments: assignments || [],
  })
}