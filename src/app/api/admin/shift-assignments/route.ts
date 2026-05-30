import { NextRequest, NextResponse } from 'next/server'
import { getStaffOrLeaderUser, getServiceClient } from '@/lib/utils/admin-auth'
import type { ShiftType } from '@/lib/types/shifts'
import { calcularCostoTurno, calcularValorHora } from '@/lib/utils/costCalculator'

// PUT /api/admin/shift-assignments — batch update de asignaciones
export async function PUT(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { schedule_id, assignments } = await request.json()

  if (!schedule_id || !Array.isArray(assignments)) {
    return NextResponse.json({ error: 'schedule_id y assignments[] son requeridos' }, { status: 400 })
  }

  // Obtener info del cronograma para saber area y week_str
  const { data: schedule } = await sb
    .from('shift_schedules')
    .select('area, week_str')
    .eq('id', schedule_id)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
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
    (staffData || []).map((s: Record<string, unknown>) => [s.id as string, Number(s.salario) || 0])
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Calcular costo total del cronograma
  const totalCost = (data || []).reduce((sum: number, a: Record<string, unknown>) => sum + (Number(a.estimated_cost) || 0), 0)
  await sb
    .from('shift_schedules')
    .update({ total_estimated_cost: totalCost, updated_at: new Date().toISOString() })
    .eq('id', schedule_id)

  return NextResponse.json({ assignments: data, total_estimated_cost: totalCost })
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