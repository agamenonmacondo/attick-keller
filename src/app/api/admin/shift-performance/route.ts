import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'
import { calcularValorHora } from '@/lib/utils/costCalculator'
import { LEGAL_PARAMS } from '@/lib/types/shifts'

// GET /api/admin/shift-performance?area=cocina&week_str=2026-W23
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const area = searchParams.get('area')
  const week_str = searchParams.get('week_str')

  if (!area) {
    return NextResponse.json({ error: 'area es requerido' }, { status: 400 })
  }

  // Obtener cronogramas del area
  let query = sb
    .from('shift_schedules')
    .select('id, week_str, status')
    .eq('area', area)
    .order('week_str', { ascending: false })
    .limit(8)

  if (week_str) {
    query = query.eq('week_str', week_str)
  }

  const { data: schedules, error: schedError } = await query
  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ kpis: null, employees: [], alerts: [] })
  }

  // Obtener asignaciones de todos los cronogramas
  const scheduleIds = schedules.map((s: Record<string, unknown>) => s.id as string)
  const { data: allAssignments, error: assignError } = await sb
    .from('shift_assignments')
    .select('*')
    .in('schedule_id', scheduleIds)

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  // Obtener tipos de turno
  const { data: shiftTypes } = await sb
    .from('shift_types')
    .select('*')
    .eq('area', area)

  const shiftTypeMap = new Map(
    (shiftTypes || []).map((st: Record<string, unknown>) => [st.code as string, st])
  )

  // Obtener personal del area
  const { data: staffData } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, salario')
    .eq('sede', 'C75')
    .eq('area', area)

  const staffMap = new Map(
    (staffData || []).map((s: Record<string, unknown>) => [s.id as string, s])
  )

  // Obtener aliases
  const staffIds = (staffData || []).map((s: Record<string, unknown>) => s.id as string)
  const { data: aliases } = await sb
    .from('staff_aliases')
    .select('employee_id, alias')
    .in('employee_id', staffIds)

  const aliasMap = new Map(
    (aliases || []).map((a: Record<string, unknown>) => [a.employee_id as string, a.alias as string])
  )

  // Agregar por empleado
  const employeeMap = new Map<string, {
    id: string;
    name: string;
    cargo: string;
    ho: number;
    hn: number;
    hed: number;
    hen: number;
    rn: number;
    rd: number;
    total: number;
    costo: number;
    legal: boolean;
    alerts: string[];
  }>()

  let totalHO = 0, totalHN = 0, totalHE = 0, totalCost = 0
  const allAlerts: { employee_id: string; name: string; message: string }[] = []

  for (const a of allAssignments || []) {
    const empId = a.employee_id as string
    const st = shiftTypeMap.get(a.shift_code as string)
    const emp = staffMap.get(empId)

    if (!st || !emp) continue

    let empStats = employeeMap.get(empId)
    if (!empStats) {
      empStats = {
        id: empId,
        name: aliasMap.get(empId) || (emp.nombre_completo as string).split(' ')[0],
        cargo: emp.cargo as string,
        ho: 0, hn: 0, hed: 0, hen: 0, rn: 0, rd: 0,
        total: 0, costo: 0, legal: true, alerts: [],
      }
      employeeMap.set(empId, empStats)
    }

    const hours = (st.ordinarias as number) + (st.nocturnas as number)
    const heDay = Math.max(0, hours - 8)

    empStats.ho += st.ordinarias as number
    empStats.hn += st.nocturnas as number
    empStats.hed += heDay
    empStats.total += hours

    // Recargo nocturno simplificado
    const valorHora = calcularValorHora(Number(emp.salario) || 0)
    empStats.rn += (st.nocturnas as number) * valorHora * LEGAL_PARAMS.NIGHT_SURCHARGE
    empStats.costo += Number(a.estimated_cost) || 0
  }

  // Verificar alertas legales por empleado
  for (const [empId, stats] of employeeMap) {
    if (stats.total > LEGAL_PARAMS.MAX_WEEKLY_HOURS) {
      const msg = `${stats.total}h supera las ${LEGAL_PARAMS.MAX_WEEKLY_HOURS}h semanales`
      stats.alerts.push(msg)
      stats.legal = false
      allAlerts.push({ employee_id: empId, name: stats.name, message: msg })
    }
  }

  // KPIs globales
  for (const stats of employeeMap.values()) {
    totalHO += stats.ho
    totalHN += stats.hn
    totalHE += stats.hed + stats.hen
    totalCost += stats.costo
  }

  return NextResponse.json({
    kpis: {
      total_horas_ord: Math.round(totalHO),
      total_horas_noc: Math.round(totalHN),
      total_horas_ext: Math.round(totalHE),
      recargo_nocturno: 0,
      recargo_dominical: 0,
      costo_total: Math.round(totalCost),
      empleados: employeeMap.size,
    },
    employees: Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    alerts: allAlerts,
  })
}