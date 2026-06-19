import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getEmployeeUser, getServiceClient } from '@/lib/utils/admin-auth'

// GET /api/admin/shift-my-hours?week_str=2026-W23
// Obtiene las horas trabajadas del colaborador (basado en checkin/checkout)
export async function GET(request: NextRequest) {
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

  let employeeId: string
  if (employee) {
    employeeId = employee.pos_nomina_staff_id
  } else {
    const queryEmployeeId = searchParams.get('employee_id')
    if (queryEmployeeId) {
      employeeId = queryEmployeeId
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
  }

  // Parse week_str (e.g. "2026-W23") to get date range
  // ISO week: Monday of that week
  const [yearStr, weekNumStr] = week_str.split('-W')
  const year = parseInt(yearStr)
  const weekNum = parseInt(weekNumStr)

  // Calculate Monday of the week
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const mondayOfWeek = new Date(jan4)
  mondayOfWeek.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7)
  const sundayOfWeek = new Date(mondayOfWeek)
  sundayOfWeek.setDate(mondayOfWeek.getDate() + 6)

  const startDate = mondayOfWeek.toISOString().split('T')[0]
  const endDate = sundayOfWeek.toISOString().split('T')[0]

  // Calculate worked hours from shift_assignments (checkin_at/checkout_at)
  // First, find the schedule for the employee's area
  const { data: areaData } = await sb
    .from('pos_nomina_staff')
    .select('area')
    .eq('id', employeeId)
    .single()

  const employeeArea = areaData?.area || 'cocina'

  const { data: schedules } = await sb
    .from('shift_schedules')
    .select('id')
    .eq('area', employeeArea)
    .eq('week_str', week_str)

  const scheduleIds = (schedules || []).map(s => s.id)

  let totalWorkedMinutes = 0
  const dailyHours: { date: string; checkin: string | null; checkout: string | null; hours: number; type?: string; description?: string }[] = []

  if (scheduleIds.length > 0) {
    // Get assignments with checkin/checkout data
    const { data: assignments } = await sb
      .from('shift_assignments')
      .select('day_index, shift_code, entrada, salida, checkin_at, checkout_at, novedad')
      .eq('employee_id', employeeId)
      .in('schedule_id', scheduleIds)

    // Map day_index to date for this week
    const mondayDate = new Date(mondayOfWeek)
    for (const asgn of (assignments || [])) {
      if (asgn.checkin_at && asgn.checkout_at) {
        const checkin = new Date(asgn.checkin_at)
        const checkout = new Date(asgn.checkout_at)
        const diffMinutes = (checkout.getTime() - checkin.getTime()) / (1000 * 60)
        totalWorkedMinutes += diffMinutes
        const dayDate = new Date(mondayDate)
        dayDate.setDate(mondayDate.getDate() + asgn.day_index)
        const dateStr = dayDate.toISOString().split('T')[0]
        dailyHours.push({
          date: dateStr,
          checkin: asgn.checkin_at,
          checkout: asgn.checkout_at,
          hours: Math.round(diffMinutes / 60 * 100) / 100,
        })
      } else if (asgn.novedad) {
        const dayDate = new Date(mondayDate)
        dayDate.setDate(mondayDate.getDate() + asgn.day_index)
        const dateStr = dayDate.toISOString().split('T')[0]
        dailyHours.push({
          date: dateStr,
          checkin: asgn.checkin_at,
          checkout: asgn.checkout_at,
          hours: 0,
          type: asgn.novedad,
        })
      }
    }
  }

  // Also get non-attendance novedades (falta, permiso, incapacidad) from shift_novedades
  const { data: novedades } = await sb
    .from('shift_novedades')
    .select('id, date, type, description')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .neq('type', 'checkin')
    .neq('type', 'checkout')
    .order('date', { ascending: true })

  for (const nov of (novedades || [])) {
    // Only add if not already covered by assignment novedad
    const alreadyHas = dailyHours.find(d => d.date === nov.date && d.type === nov.type)
    if (!alreadyHas) {
      dailyHours.push({
        date: nov.date,
        checkin: null,
        checkout: null,
        hours: 0,
        type: nov.type,
        description: nov.description || undefined,
      })
    }
  }

  // Sort by date
  dailyHours.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))

  const totalWorkedHours = Math.round(totalWorkedMinutes / 60 * 100) / 100

  return NextResponse.json({
    employee_id: employeeId,
    week_str,
    total_worked_hours: totalWorkedHours,
    daily: dailyHours,
  })
}