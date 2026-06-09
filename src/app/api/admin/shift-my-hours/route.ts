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

  // Get all novedades with checkin/checkout for the week
  const { data: novedades, error } = await sb
    .from('shift_novedades')
    .select('id, date, type, checkin_at, checkout_at, location, description')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  // Calculate total worked hours from checkin/checkout pairs
  let totalWorkedMinutes = 0
  const dailyHours: { date: string; checkin: string | null; checkout: string | null; hours: number; type?: string; description?: string }[] = []

  for (const nov of (novedades || [])) {
    if (nov.checkin_at && nov.checkout_at) {
      const checkin = new Date(nov.checkin_at)
      const checkout = new Date(nov.checkout_at)
      const diffMinutes = (checkout.getTime() - checkin.getTime()) / (1000 * 60)
      totalWorkedMinutes += diffMinutes
      dailyHours.push({
        date: nov.date,
        checkin: nov.checkin_at,
        checkout: nov.checkout_at,
        hours: Math.round(diffMinutes / 60 * 100) / 100,
      })
    } else if (nov.type !== 'checkin' && nov.type !== 'checkout') {
      // Non-attendance novedades (falta, tarde, permiso, incapacidad)
      dailyHours.push({
        date: nov.date,
        checkin: nov.checkin_at,
        checkout: nov.checkout_at,
        hours: 0,
        type: nov.type,
        description: nov.description || undefined,
      })
    }
  }

  const totalWorkedHours = Math.round(totalWorkedMinutes / 60 * 100) / 100

  return NextResponse.json({
    employee_id: employeeId,
    week_str,
    total_worked_hours: totalWorkedHours,
    daily: dailyHours,
  })
}