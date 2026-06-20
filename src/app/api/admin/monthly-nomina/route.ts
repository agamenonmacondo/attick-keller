import { NextRequest, NextResponse } from 'next/server';
import { getStaffOrLeaderUser, getServiceClient } from '@/lib/utils/admin-auth';
import { calcularCostoTurnoEmpresa } from '@/lib/utils/costCalculator';
import type { ShiftType } from '@/lib/types/shifts';

export const dynamic = 'force-dynamic';

const VALID_AREAS = ['cocina', 'barra', 'servicio', 'todos'];

// ISO week string from a calendar date (YYYY, M 1-12, D).
// NOTE: duplicates the helper in sales-averages/route.ts (same algorithm as
// costCalculator.getWeekStr). Kept local to avoid a shared-file refactor.
function colombiaWeekStr(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.floor((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

// Days in a given month (month is 1-12)
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

interface SemanaAgg {
  week_str: string;
  costo: number;
  personas: number;
}

interface EmpleadoAgg {
  id: string;
  nombre: string;
  costo: number;
  turnos: number;
}

// GET /api/admin/monthly-nomina?month=2026-06&area=cocina|barra|servicio|todos
// Suma el COSTO EMPRESA real de todos los turnos asignados en las semanas que
// se solapan con el mes indicado. Usa la convencion day_index === 0 = Domingo
// (igual que el tab semanal de Referencia).
export async function GET(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const sb = getServiceClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  let area = searchParams.get('area') || 'todos';

  // lider_area solo puede ver su propia area
  if (admin.role === 'lider_area') {
    if (!admin.area) {
      return NextResponse.json({ error: 'No autorizado — sin área asignada' }, { status: 403 });
    }
    area = admin.area;
  }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month requerido (formato YYYY-MM)' }, { status: 400 });
  }
  if (!VALID_AREAS.includes(area)) {
    return NextResponse.json({ error: 'area invalida' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);

  // Conjunto de week_str que se solapan con el mes
  const weekSet = new Set<string>();
  const dim = daysInMonth(year, mon);
  for (let d = 1; d <= dim; d++) {
    weekSet.add(colombiaWeekStr(year, mon, d));
  }
  const weeks = Array.from(weekSet);

  // Traer los cronogramas de esas semanas (ultima version por area+week_str)
  let scheduleQuery = sb
    .from('shift_schedules')
    .select('id, area, week_str, version')
    .in('week_str', weeks)
    .order('version', { ascending: false });

  if (area !== 'todos') {
    scheduleQuery = scheduleQuery.eq('area', area);
  }

  const { data: schedules, error: schedError } = await scheduleQuery;
  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 });
  }

  // Dedup: latest version por (area:week_str)
  const seen = new Set<string>();
  const activeSchedules = (schedules || []).filter((s: { area: string; week_str: string }) => {
    const key = `${s.area}:${s.week_str}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (activeSchedules.length === 0) {
    return NextResponse.json({
      month,
      area,
      total_costo_empresa: 0,
      total_personas: 0,
      semanas: [],
      empleados: [],
    });
  }

  const scheduleIds = activeSchedules.map((s: { id: string }) => s.id as string);
  const scheduleById = new Map(activeSchedules.map((s: { id: string; area: string; week_str: string }) => [s.id, s]));

  // Asignaciones de todos esos cronogramas
  const { data: assignments, error: assignError } = await sb
    .from('shift_assignments')
    .select('schedule_id, employee_id, day_index, shift_code')
    .in('schedule_id', scheduleIds);

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  // shift_types por area involucrada
  const involvedAreas = Array.from(new Set(activeSchedules.map((s: { area: string }) => s.area))) as string[];
  const { data: shiftTypesRows } = await sb
    .from('shift_types')
    .select('*')
    .in('area', involvedAreas);

  // Mapa area:code -> ShiftType
  const typeMap = new Map<string, ShiftType>();
  for (const st of (shiftTypesRows || []) as unknown as ShiftType[]) {
    typeMap.set(`${st.area}:${st.code}`, st);
  }

  // Salarios y nombres de los empleados involucrados
  const employeeIds = Array.from(new Set((assignments || []).map((a: { employee_id: string }) => a.employee_id as string)));
  let salaryMap = new Map<string, number>();
  let nameMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: staffRows } = await sb
      .from('pos_nomina_staff')
      .select('id, nombre_completo, salario')
      .in('id', employeeIds);
    for (const s of (staffRows || []) as unknown as { id: string; nombre_completo: string; salario: number | null }[]) {
      salaryMap.set(s.id, Number(s.salario) || 0);
      nameMap.set(s.id, s.nombre_completo || '—');
    }
  }

  // Agregar
  const SUNDAY_DAY_INDEX = 0;
  let totalCosto = 0;
  let totalPersonas = 0;
  let skippedNoType = 0;

  const semanaMap = new Map<string, SemanaAgg>();
  const empleadoMap = new Map<string, EmpleadoAgg>();

  for (const a of (assignments || []) as { schedule_id: string; employee_id: string; day_index: number; shift_code: string }[]) {
    const sched = scheduleById.get(a.schedule_id);
    if (!sched) continue;

    const shiftType = typeMap.get(`${sched.area}:${a.shift_code}`);
    if (!shiftType) {
      skippedNoType++;
      continue;
    }

    const salario = salaryMap.get(a.employee_id) || 0;
    const isSunday = a.day_index === SUNDAY_DAY_INDEX;
    const costo = calcularCostoTurnoEmpresa(shiftType, salario, isSunday).total;

    totalCosto += costo;
    totalPersonas += 1;

    // Por semana
    const ws = sched.week_str as string;
    const sem = semanaMap.get(ws) || { week_str: ws, costo: 0, personas: 0 };
    sem.costo += costo;
    sem.personas += 1;
    semanaMap.set(ws, sem);

    // Por empleado
    const empId = a.employee_id as string;
    const emp = empleadoMap.get(empId) || { id: empId, nombre: nameMap.get(empId) || '—', costo: 0, turnos: 0 };
    emp.costo += costo;
    emp.turnos += 1;
    empleadoMap.set(empId, emp);
  }

  // === LIDERES SIN TURNOS (costo fijo mensual) ===
  // Empleados activos con cargo de lider que NO tienen asignaciones de turno.
  // Su costo se calcula como salario × factor_empresa × (semanas del mes / 4.33)
  const LIDER_CARGOS = [
    'JEFE DE BAR', 'JEFE DE SERVICIO', 'CHEF EJECUTIVO', 'JEFE DE COCINA',
    'SUB JEFE SERVICIO', 'JEFE BAR',
  ];
  const FACTOR_EMPRESA = 1.548;

  // Get all active staff matching the area filter (or all if "todos")
  let staffQuery = sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, salario')
    .eq('activo', true);
  if (area !== 'todos') {
    staffQuery = staffQuery.eq('area', area);
  }
  const { data: allStaffRows } = await staffQuery;

  const leaderEntries: EmpleadoAgg[] = [];
  let leaderCosto = 0;

  for (const s of (allStaffRows || []) as { id: string; nombre_completo: string; cargo: string; area: string; salario: number | null }[]) {
    const cargo = (s.cargo || '').toUpperCase();
    const isLeader = LIDER_CARGOS.some(lc => cargo.includes(lc));
    if (!isLeader) continue;

    // Check if this leader already has shift assignments (they're counted in the per-turno calculation)
    if (empleadoMap.has(s.id)) continue;

    // Leader without shifts — fixed monthly cost
    const salario = Number(s.salario) || 0;
    if (salario === 0) continue;

    const costoMensual = salario * FACTOR_EMPRESA;
    const semanasEnMes = weeks.length;
    const costoParaMes = costoMensual * (semanasEnMes / 4.33);

    leaderCosto += costoParaMes;
    leaderEntries.push({
      id: s.id,
      nombre: s.nombre_completo || '—',
      costo: Math.round(costoParaMes),
      turnos: 0,
    });
  }

  totalCosto += leaderCosto;

  const semanas = Array.from(semanaMap.values())
    .sort((a, b) => a.week_str.localeCompare(b.week_str))
    .map(s => ({ ...s, costo: Math.round(s.costo) }));

  const empleados = Array.from(empleadoMap.values())
    .sort((a, b) => b.costo - a.costo)
    .map(e => ({ ...e, costo: Math.round(e.costo) }))
    .concat(leaderEntries.map(e => ({ ...e, costo: Math.round(e.costo), is_fixed_salary: true })));

  return NextResponse.json({
    month,
    area,
    total_costo_empresa: Math.round(totalCosto),
    total_personas: totalPersonas + leaderEntries.length,
    semanas,
    empleados,
    lideres_fijos: leaderEntries.map(e => ({ ...e, costo: Math.round(e.costo), is_fixed_salary: true })),
    _debug: {
      weeks: weeks.length,
      schedules: activeSchedules.length,
      assignments: (assignments || []).length,
      skipped_no_type: skippedNoType,
      leader_entries: leaderEntries.length,
    },
  });
}