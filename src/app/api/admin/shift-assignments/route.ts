import { NextRequest, NextResponse } from 'next/server'
import { getStaffOrLeaderUser, getServiceClient } from '@/lib/utils/admin-auth'
import type { ShiftType } from '@/lib/types/shifts'
import { calcularCostoTurno, calcularValorHora } from '@/lib/utils/costCalculator'
import { sendShiftChangeEmail } from '@/lib/email/send'

// Force dynamic — never cache shift data
export const dynamic = 'force-dynamic'

// PUT /api/admin/shift-assignments — batch update de asignaciones
export async function PUT(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { schedule_id, assignments } = body

  if (!schedule_id || !Array.isArray(assignments)) {
    return NextResponse.json({ error: 'schedule_id y assignments[] son requeridos' }, { status: 400 })
  }

  // Obtener info del cronograma para saber area, week_str y status
  const { data: schedule } = await sb
    .from('shift_schedules')
    .select('area, week_str, status')
    .eq('id', schedule_id)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
  }

  // Obtener asignaciones ANTERIORES para comparar cambios (solo si published)
  let previousAssignments: Map<string, string> | null = null
  if (schedule.status === 'published') {
    const { data: prev } = await sb
      .from('shift_assignments')
      .select('employee_id, day_index, shift_code')
      .eq('schedule_id', schedule_id)
    if (prev && prev.length > 0) {
      previousAssignments = new Map(
        prev.map((a: Record<string, unknown>) =>
          [`${a.employee_id}:${a.day_index}`, a.shift_code as string]
        )
      )
    }
  }

  // Obtener shift_types para calcular costos
  const { data: shiftTypes } = await sb
    .from('shift_types')
    .select('*')
    .eq('area', schedule.area)

  const shiftTypeMap = new Map(
    (shiftTypes || []).map((st: ShiftType) => [st.code, st])
  )

  // Obtener salarios de empleados
  const employeeIds = [...new Set(assignments.map((a: Record<string, unknown>) => a.employee_id as string))]
  const { data: staffData } = await sb
    .from('pos_nomina_staff')
    .select('id, salario')
    .in('id', employeeIds)

  const salaryMap = new Map(
    (staffData || []).map((s: Record<string, unknown>) => {
      const raw = Number(s.salario) || 0
      // Sanitize: cap at 50M (5x salario minimo legal) to prevent numeric overflow
      const sanitized = raw > 50000000 ? 0 : raw
      return [s.id as string, sanitized]
    })
  )

  // Calcular dias de la semana para determinar domingos
  const weekDates = getWeekDates(schedule.week_str)

  // Enriquecer asignaciones con costos estimados
  const enrichedAssignments = assignments.map((a: Record<string, unknown>) => {
    const shiftType = shiftTypeMap.get(a.shift_code as string)
    const salario = salaryMap.get(a.employee_id as string) || 0
    const dayIndex = a.day_index as number
    const isSunday = weekDates[dayIndex]?.getDay() === 0

    let estimated_hours = null
    let estimated_cost = null
    let is_overtime = false

    if (shiftType) {
      estimated_hours = shiftType.ordinarias + shiftType.nocturnas
      is_overtime = estimated_hours > 8
      estimated_cost = calcularCostoTurno(shiftType, salario, isSunday).total
    }

    return {
      schedule_id,
      employee_id: a.employee_id,
      day_index: dayIndex,
      shift_code: a.shift_code,
      entrada: a.entrada || null,
      salida: a.salida || null,
      novedad: a.novedad || null,
      turnante_nombre: a.turnante_nombre || null,
      is_overtime,
      estimated_hours,
      estimated_cost,
    }
  })

  // Borrar asignaciones existentes
  const { error: deleteError } = await sb
    .from('shift_assignments')
    .delete()
    .eq('schedule_id', schedule_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Insertar nuevas
  const { data, error: insertError } = await sb
    .from('shift_assignments')
    .insert(enrichedAssignments)
    .select()

  if (insertError) {
    console.error('[API shift-assignments PUT] Insert error:', insertError.message, insertError.code, insertError.details)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Calcular costo total del cronograma
  const totalCost = (data || []).reduce((sum: number, a: Record<string, unknown>) => sum + (Number(a.estimated_cost) || 0), 0)
  await sb
    .from('shift_schedules')
    .update({ total_estimated_cost: totalCost, updated_at: new Date().toISOString() })
    .eq('id', schedule_id)

  // Determinar empleados afectados por cambios (solo si published)
  if (schedule.status === 'published' && previousAssignments) {
    const changedEmployeeIds = new Set<string>()

    // Comparar asignaciones nuevas vs anteriores
    const newAssignmentsMap = new Map(
      (data || []).map((a: Record<string, unknown>) =>
        [`${a.employee_id}:${a.day_index}`, a.shift_code as string]
      )
    )

    // Empleados con turnos cambiados o eliminados
    for (const [key, code] of previousAssignments) {
      if (newAssignmentsMap.get(key) !== code) {
        const [empId] = key.split(':')
        changedEmployeeIds.add(empId)
      }
    }

    // Empleados con turnos nuevos (que no existían antes)
    for (const [key] of newAssignmentsMap) {
      if (!previousAssignments.has(key)) {
        const [empId] = key.split(':')
        changedEmployeeIds.add(empId)
      }
    }

    // Enviar correos a empleados afectados (fire-and-forget)
    if (changedEmployeeIds.size > 0) {
      console.log('[API shift-assignments PUT] Notifying', changedEmployeeIds.size, 'affected employees')
      notifyAffectedEmployees(
        schedule_id,
        schedule.area,
        schedule.week_str,
        changedEmployeeIds,
        data || [],
        shiftTypeMap,
        sb
      ).then(result => {
        console.log('[API shift-assignments PUT] Notification results:', result)
      }).catch(err => {
        console.error('[API shift-assignments PUT] Notification error:', err)
      })
    }
  }

  return NextResponse.json({ assignments: data, total_estimated_cost: totalCost })
}

// Notificar empleados afectados por cambios en su horario
async function notifyAffectedEmployees(
  scheduleId: string,
  area: string,
  weekStr: string,
  changedEmployeeIds: Set<string>,
  newAssignments: Record<string, unknown>[],
  shiftTypeMap: Map<string, any>,
  sb: any
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }
  const { data: { users } } = await sb.auth.admin.listUsers()

  for (const employeeId of changedEmployeeIds) {
    try {
      // Obtener info del empleado
      const { data: emp } = await sb
        .from('pos_nomina_staff')
        .select('id, nombre_completo, correo')
        .eq('id', employeeId)
        .single()

      if (!emp) continue

      // Buscar email
      let email = emp.correo
      if (!email) {
        const { data: userRole } = await sb
          .from('user_roles')
          .select('auth_user_id')
          .eq('pos_nomina_staff_id', employeeId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (userRole) {
          const authUser = users.find((u: any) => u.id === userRole.auth_user_id)
          email = authUser?.email || ''
        }
      }
      if (!email) continue

      // Buscar alias
      const { data: aliasData } = await sb
        .from('staff_aliases')
        .select('alias')
        .eq('employee_id', employeeId)
        .limit(1)
      const name = (aliasData && aliasData[0]?.alias) || emp.nombre_completo.split(' ')[0]

      // Construir asignaciones del empleado
      const empAssignments = newAssignments
        .filter((a: Record<string, unknown>) => a.employee_id === employeeId)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.day_index as number) - (b.day_index as number))
        .map((a: Record<string, unknown>) => {
          const st = shiftTypeMap.get(a.shift_code as string)
          return {
            shiftCode: a.shift_code as string,
            shiftName: st?.name || a.shift_code,
            entrada: st?.entrada || '',
            salida: st?.salida || '',
            hours: (st?.ordinarias || 0) + (st?.nocturnas || 0),
            dayIndex: a.day_index as number,
          }
        })

      if (empAssignments.length === 0) continue

      const recipients = [{
        email,
        name,
        employeeId,
        assignments: empAssignments,
      }]

      const result = await sendShiftChangeEmail(weekStr, area, scheduleId, recipients, sb)
      results.sent += result.sent
      results.failed += result.failed
      results.errors.push(...result.errors)
    } catch (err: any) {
      results.failed++
      results.errors.push(`${employeeId}: ${err.message}`)
    }
  }

  return results
}

// Helper: obtener fechas de la semana ISO
function getWeekDates(weekStr: string): Date[] {
  const [year, week] = weekStr.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}