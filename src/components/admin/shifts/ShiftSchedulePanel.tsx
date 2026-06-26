'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CaretLeft, CaretRight, FloppyDisk, PaperPlaneTilt, ClockClockwise, ChartBar, ChartLineUp, PencilSimple, IdentificationBadge, Trash, DownloadSimple } from '@phosphor-icons/react';
import { SectionHeading } from '../shared/SectionHeading';

import type { ShiftType, StaffMemberForShift, ShiftAssignment } from '@/lib/types/shifts';
import { getWeekStr, getWeekDates, dayIndexToDateIndex, calcularCostoTurnoEmpresa, calcularRecargosTurnoEmpresa, calcularHorasTurno, formatCOP } from '@/lib/utils/costCalculator';
import { DAY_NAMES, LEGAL_PARAMS } from '@/lib/types/shifts';
import { getLocalDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/lib/ThemeProvider';
import ShiftGrid from './ShiftGrid';
import CostEstimationBar from './CostEstimationBar';
import StaffPanel from './StaffPanel';
import ShiftTimelineView from './ShiftTimelineView';
import ShiftTypeModal from './ShiftTypeModal';

import SalesReferenceTab from './SalesReferenceTab';

type Area = 'cocina' | 'barra' | 'servicio' | 'todos';
type Tab = 'cronograma' | 'costos' | 'referencia' | 'horarios' | 'personal';

const AREAS: { value: Area; label: string }[] = [
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'todos', label: 'Todos' },
];

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getHeatClasses(count: number, isDark: boolean): { bg: string; text: string } {
  if (isDark) {
    if (count === 0) return { bg: 'bg-[var(--bg-input)]', text: 'text-[var(--text-muted)]' };
    if (count <= 3) return { bg: 'bg-[var(--color-ak-borgona)]/25', text: 'text-[var(--border-light)]' };
    if (count <= 7) return { bg: 'bg-[var(--color-ak-borgona)]/45', text: 'text-white' };
    return { bg: 'bg-[var(--color-ak-borgona)]/70', text: 'text-white' };
  }
  if (count === 0) return { bg: 'bg-[var(--bg-input)]', text: 'text-[var(--text-secondary)]' };
  if (count <= 3) return { bg: 'bg-[var(--color-ak-borgona)]/15', text: 'text-[var(--text-primary)]' };
  if (count <= 7) return { bg: 'bg-[var(--color-ak-borgona)]/35', text: 'text-[var(--text-primary)]' };
  return { bg: 'bg-[var(--color-ak-borgona)]/60', text: 'text-white' };
}

interface ShiftSchedulePanelProps {
  areaFilter?: string; // When set (lider_area), lock area to this value
}

export default function ShiftSchedulePanel({ areaFilter }: ShiftSchedulePanelProps) {
  // If areaFilter is set (lider_area), lock to that area and never allow changes
  // If no areaFilter (super_admin/store_admin), start on "todos" to see all areas
  const [area, setArea] = useState<Area>(() =>
    areaFilter && AREAS.some(a => a.value === areaFilter) ? (areaFilter as Area) : 'todos'
  );
  const [tab, setTab] = useState<Tab>(() => area === 'todos' ? 'personal' : 'cronograma');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null);

  // Cuando se cambia a "todos", forzar tab de personal (super_admin)
  // Si areaFilter está activo, nunca puede llegar a "todos"
  useEffect(() => {
    if (area === 'todos' && tab !== 'personal') setTab('personal');
  }, [area]);
  const [weekStr, setWeekStr] = useState(() => getWeekStr(new Date()));
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [staff, setStaff] = useState<StaffMemberForShift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<string>('draft');
  const [saving, setSaving] = useState(false);
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>({});
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Track whether grid has unsaved local changes
  const gridDirtyRef = useRef(false);

  // Exportar CSV de turnos
  const handleExportCSV = useCallback(() => {
    if (staff.length === 0) return;

    // day_index order for CSV columns: Lun(1) Mar(2) ... Sab(6) Dom(0)
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekDatesLocal = getWeekDates(weekStr);

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const formatHorario = (code: string, st: ShiftType | undefined): string => {
      if (!code || code === 'OFF') return '';
      if (!st) return code;
      if (st.is_split && st.segments && st.segments.length > 0) {
        return st.segments.map(s => `${s.entrada}-${s.salida}`).join(' / ');
      }
      return `${st.entrada}-${st.salida}`;
    };

    // Header row
    const headers = [
      'Colaborador', 'Cargo', 'Salario Mensual',
      ...dayOrder.map(di => DAY_NAMES[di]),
      ...dayOrder.map(di => `${DAY_NAMES[di]} Horario`),
      'Horas Ordinarias', 'Horas Nocturnas', 'Horas Extra', 'Total Horas',
      'Recargo Noc', 'Recargo Dom', 'HE$', 'Total Recargos',
      'Dia Descanso', 'Alertas',
    ];

    const rows: string[][] = [];

    let totalOrd = 0, totalNoc = 0, totalHE = 0, totalHoras = 0;
    let totalRN = 0, totalRD = 0, totalHE$ = 0, totalRecargos = 0;

    for (const emp of staff) {
      const empGrid = grid[emp.id] || {};
      let empOrd = 0, empNoc = 0, empOvertime = 0, empRN = 0, empRD = 0, empHE$ = 0, empRecargos = 0;
      let diasTrabajados = 0;
      const alerts: string[] = [];

      const dayCodes: string[] = [];
      const dayHorarios: string[] = [];

      for (const di of dayOrder) {
        const code = empGrid[di] || '';
        dayCodes.push(code || '');

        const st = code && code !== 'OFF' ? shiftTypes.find(t => t.code === code) : undefined;
        dayHorarios.push(formatHorario(code, st));

        if (!code || code === 'OFF') continue;
        if (!st) continue;

        const isSunday = di === 0;
        const horas = calcularHorasTurno(st);
        empOrd += horas.ordinarias;
        empNoc += horas.nocturnas;
        diasTrabajados++;

        const recargos = calcularRecargosTurnoEmpresa(st, emp.salario_mensual, isSunday);
        empRN += recargos.night_surcharge;
        empRD += recargos.sunday_surcharge;
        empHE$ += recargos.overtime_surcharge;
        empRecargos += recargos.total_recargos;

        // Extra diario si > 8h
        if (horas.total > LEGAL_PARAMS.MAX_DAILY_HOURS) {
          alerts.push(`${DAY_NAMES[di]}: ${horas.total}h supera ${LEGAL_PARAMS.MAX_DAILY_HOURS}h`);
        }
      }

      if (empOrd + empNoc > LEGAL_PARAMS.MAX_WEEKLY_HOURS) {
        alerts.push(`${empOrd + empNoc}h semanales supera ${LEGAL_PARAMS.MAX_WEEKLY_HOURS}h`);
      }
      if (diasTrabajados >= 7) {
        alerts.push('Sin dia de descanso');
      }

      const empWeeklyOvertime = Math.max(0, empOrd + empNoc - LEGAL_PARAMS.MAX_WEEKLY_HOURS);

      totalOrd += empOrd;
      totalNoc += empNoc;
      totalHE += empWeeklyOvertime;
      totalHoras += empOrd + empNoc;
      totalRN += empRN;
      totalRD += empRD;
      totalHE$ += empHE$;
      totalRecargos += empRecargos;

      rows.push([
        escapeCSV(emp.alias),
        escapeCSV(emp.cargo),
        String(emp.salario_mensual),
        ...dayCodes.map(escapeCSV),
        ...dayHorarios.map(escapeCSV),
        empOrd.toFixed(1),
        empNoc.toFixed(1),
        empWeeklyOvertime.toFixed(1),
        (empOrd + empNoc).toFixed(1),
        String(Math.round(empRN)),
        String(Math.round(empRD)),
        String(Math.round(empHE$)),
        String(Math.round(empRecargos)),
        diasTrabajados < 7 ? 'Si' : 'No',
        escapeCSV(alerts.join('; ')),
      ]);
    }

    // Total row
    rows.push([
      `TOTAL ${area.toUpperCase()}`,
      `${staff.length} empleados`,
      '',
      ...dayOrder.map(() => ''),
      ...dayOrder.map(() => ''),
      totalOrd.toFixed(1),
      totalNoc.toFixed(1),
      totalHE.toFixed(1),
      totalHoras.toFixed(1),
      String(Math.round(totalRN)),
      String(Math.round(totalRD)),
      String(Math.round(totalHE$)),
      String(Math.round(totalRecargos)),
      '',
      '',
    ]);

    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const areaLabel = area === 'todos' ? 'consolidado' : area;
    link.href = url;
    link.download = `turnos_${areaLabel}_${weekStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [staff, shiftTypes, grid, weekStr, area]);

  // Compute heatmap days from assignments
  const days = useMemo(() => {
    const result: Record<string, number> = {};
    const weekDates = getWeekDates(weekStr);
    for (const a of assignments) {
      const dateIndex = dayIndexToDateIndex(a.day_index);
      const date = weekDates[dateIndex];
      if (date) {
        const dateStr = getLocalDate(date);
        result[dateStr] = (result[dateStr] || 0) + 1;
      }
    }
    return result;
  }, [assignments, weekStr]);

  const today = useMemo(() => getLocalDate(), []);
  const weekDates = useMemo(() => getWeekDates(weekStr), [weekStr]);

  // Bloquear semanas pasadas — solo semana actual y futuras
  const currentWeekStr = useMemo(() => getWeekStr(new Date()), []);
  const isWeekEditable = (wStr: string) => wStr >= currentWeekStr;

  // Navegacion semana a semana — aritmetica pura sobre weekStr, sin objetos Date
  const handlePrevWeek = () => {
    const [year, week] = weekStr.split('-W').map(Number);
    if (week === 1) {
      setWeekStr(`${year - 1}-W52`);
    } else {
      setWeekStr(`${year}-W${String(week - 1).padStart(2, '0')}`);
    }
  };

  const handleNextWeek = () => {
    const [year, week] = weekStr.split('-W').map(Number);
    if (week === 52) {
      setWeekStr(`${year + 1}-W01`);
    } else {
      setWeekStr(`${year}-W${String(week + 1).padStart(2, '0')}`);
    }
  };

  const handleToday = () => {
    setWeekStr(getWeekStr(new Date()));
  };

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      if (area === 'todos') {
        // Modo consolidado: fetch todas las areas en paralelo
        const areas: ('cocina' | 'barra' | 'servicio')[] = ['cocina', 'barra', 'servicio'];
        const results = await Promise.all(
          areas.map(a => fetch(`/api/admin/shift-schedules?area=${a}&week_str=${weekStr}`, { credentials: 'include' }).then(r => r.json()))
        );

        const allStaff = results.flatMap(r => r.staff || []);
        const allAssignments = results.flatMap(r => r.assignments || []);
        const allShiftTypes = results.flatMap(r => r.shift_types || []);

        // Deduplicar shift types por code
        const seenCodes = new Set<string>();
        const uniqueShiftTypes = allShiftTypes.filter((st: { code: string }) => {
          if (seenCodes.has(st.code)) return false;
          seenCodes.add(st.code);
          return true;
        });

        setShiftTypes(uniqueShiftTypes);
        setStaff(allStaff);
        setAssignments(allAssignments);
        setScheduleId(null);
        setScheduleStatus('draft');

        const initialGrid: Record<string, Record<number, string>> = {};
        for (const s of allStaff) {
          initialGrid[s.id] = {};
        }
        for (const a of allAssignments) {
          if (!initialGrid[a.employee_id]) initialGrid[a.employee_id] = {};
          initialGrid[a.employee_id][a.day_index] = a.shift_code;
        }
        setGrid(initialGrid);
        gridDirtyRef.current = false;
      } else {
        const res = await fetch(`/api/admin/shift-schedules?area=${area}&week_str=${weekStr}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error cargando datos');
        const data = await res.json();

        setShiftTypes(data.shift_types || []);
        setStaff(data.staff || []);
        setAssignments(data.assignments || []);
        setScheduleId(data.schedule?.id || null);
        setScheduleStatus(data.schedule?.status || 'draft');

        const initialGrid: Record<string, Record<number, string>> = {};
        for (const s of data.staff || []) {
          initialGrid[s.id] = {};
        }
        for (const a of data.assignments || []) {
          if (!initialGrid[a.employee_id]) initialGrid[a.employee_id] = {};
          initialGrid[a.employee_id][a.day_index] = a.shift_code;
        }
        setGrid(initialGrid);
        gridDirtyRef.current = false;
      }
    } catch (err) {
      console.error('Error loading shift data:', err);
    }
  }, [area, weekStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guardar asignaciones
  const handleSave = async () => {
    // Verificar si hay turnos en la grilla
    const hasAssignments = Object.values(grid).some(days => Object.keys(days).length > 0);
    if (!hasAssignments) {
      alert('No hay turnos asignados para guardar.');
      return;
    }

    // Verificar semana editable
    if (!isWeekEditable(weekStr)) {
      alert('No se pueden editar semanas pasadas.');
      return;
    }

    setSaving(true);
    try {
      let schedId = scheduleId;
      console.log('[Turnos] Guardando...', { scheduleId: schedId, area, weekStr, gridEntries: Object.keys(grid).length });

      // Crear cronograma si no existe
      if (!schedId) {
        try {
          console.log('[Turnos] Creando cronograma...', { area, week_str: weekStr });
          const res = await fetch('/api/admin/shift-schedules', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area, week_str: weekStr }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[Turnos] Error creating schedule:', res.status, errData);
            throw new Error(errData.error || `Error creando cronograma (${res.status})`);
          }
          const data = await res.json();
          console.log('[Turnos] Cronograma creado:', data);
          schedId = data.id;
          setScheduleId(data.id);
          setScheduleStatus('draft');
        } catch (err) {
          console.error('[Turnos] Error creating schedule:', err);
          alert(`Error creando cronograma: ${err instanceof Error ? err.message : 'Error desconocido'}`);
          return;
        }
      }

      // Guardar asignaciones
      const payload: { employee_id: string; day_index: number; shift_code: string; estimated_hours: number | null; estimated_cost: number | null; estimated_recargos: number | null }[] = [];

      for (const [empId, days] of Object.entries(grid)) {
        for (const [dayIdx, code] of Object.entries(days)) {
          if (!code || code === 'OFF') continue;
          const st = shiftTypes.find((t) => t.code === code);
          const emp = staff.find((e) => e.id === empId);
          if (!st || !emp) continue;

          const hours = st.ordinarias + st.nocturnas;
          const isSunday = Number(dayIdx) === 0;
          const cost = calcularCostoTurnoEmpresa(st, emp.salario_mensual, isSunday);
          const recargos = calcularRecargosTurnoEmpresa(st, emp.salario_mensual, isSunday);

          payload.push({
            employee_id: empId,
            day_index: Number(dayIdx),
            shift_code: code,
            estimated_hours: hours,
            estimated_cost: cost.total,
            estimated_recargos: recargos.total_recargos,
          });
        }
      }

      if (payload.length === 0) {
        alert('No hay turnos asignados para guardar.');
        return;
      }

      console.log('[Turnos] Guardando asignaciones...', { schedule_id: schedId, count: payload.length });
      const res = await fetch('/api/admin/shift-assignments', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: schedId, assignments: payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[Turnos] Error saving assignments:', res.status, errData);
        throw new Error(errData.error || `Error guardando asignaciones (${res.status})`);
      }

      const result = await res.json();

      // Recargar datos para sincronizar
      await loadData();
      alert('Asignaciones guardadas correctamente');
    } catch (err) {
      console.error('[Turnos] Error saving:', err);
      alert(`Error guardando: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  // Publicar cronograma
  const handlePublish = async () => {
    if (!scheduleId) return;
    if (!confirm('Publicar cronograma? Los colaboradores podran ver sus turnos.')) return;

    try {
      const res = await fetch(`/api/admin/shift-schedules/${scheduleId}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error publicando');
      setScheduleStatus('published');
      alert('Cronograma publicado');
    } catch (err) {
      console.error('Error publishing:', err);
    }
  };

  // Handle grid changes from ShiftGrid — directly update parent state
  const handleGridChange = useCallback((newGrid: Record<string, Record<number, string>>) => {
    gridDirtyRef.current = true;
    setGrid(newGrid);
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeading>Turnos</SectionHeading>

      {/* Controles superiores */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de area — locked when areaFilter is set (lider_area) */}
        {areaFilter ? (
          <span className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--color-ak-borgona)]/40 bg-[var(--color-ak-borgona)]/10 text-[var(--text-primary)] text-sm font-semibold inline-flex items-center">
            {AREAS.find(a => a.value === areaFilter)?.label ?? areaFilter}
          </span>
        ) : (
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as Area)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
          >
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        )}

        {/* Status badge */}
        <span className={`text-xs px-2 py-1 rounded-full
          ${scheduleStatus === 'published' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'}`}
        >
          {scheduleStatus === 'published' ? 'Publicado' : 'Borrador'}
        </span>

        {/* Rango de semana */}
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] min-w-[120px] text-center">
          {weekDates[0] && (() => {
            const from = weekDates[0];
            const to = weekDates[6];
            const fmtShort = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()}`;
            return `${fmtShort(from)} - ${fmtShort(to)}`;
          })()}
        </span>
        <button
          type="button"
          onClick={handleToday}
          className="rounded-lg px-2.5 py-1 text-[10px] font-medium border border-[var(--color-ak-borgona)]/30 text-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10 active:scale-[0.97] transition-all duration-200"
        >
          Hoy
        </button>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 ml-auto">
          {[
            { id: 'cronograma' as Tab, icon: <ClockClockwise size={14} />, label: 'Cronograma' },
            { id: 'costos' as Tab, icon: <ChartBar size={14} />, label: 'Costos' },
            { id: 'referencia' as Tab, icon: <ChartLineUp size={14} />, label: 'Referencia' },
            { id: 'horarios' as Tab, icon: <PencilSimple size={14} />, label: 'Horarios' },
            { id: 'personal' as Tab, icon: <IdentificationBadge size={14} />, label: 'Personal' },
          ].filter(t => {
            // Modo consolidado: solo costos y referencia
            if (area === 'todos') return t.id === 'costos' || t.id === 'referencia';
            // Líder de área (areaFilter): solo cronograma, horarios y personal
            if (areaFilter) return t.id === 'cronograma' || t.id === 'horarios' || t.id === 'personal';
            return true;
          }).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                ${tab === t.id
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={staff.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]
              bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10 hover:text-[var(--color-ak-borgona)]
              disabled:opacity-30 disabled:cursor-not-allowed"
            title="Exportar CSV"
          >
            <DownloadSimple size={16} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Week strip — 7 dias Lun-Dom + flechas */}
      <div className="flex items-stretch gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
        {weekDates.map((date, i) => {
          const dateStr = getLocalDate(date);
          const count = days[dateStr] || 0;
          const isToday = dateStr === today;
          const isSunday = i === 6;
          const heat = getHeatClasses(count, isDark);

          return (
            <div
              key={i}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 px-1 transition-all duration-100',
                heat.bg,
                heat.text,
                isToday && 'ring-2 ring-[var(--color-ak-borgona)] ring-offset-1 ring-offset-[var(--bg-card)]',
                isSunday && 'font-semibold',
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                {WEEKDAYS[i]}
              </span>
              <span className="text-lg font-semibold leading-none">
                {date.getDate()}
              </span>
              <span className="text-[9px] opacity-60">
                {MONTH_NAMES[date.getMonth()].slice(0, 3).toLowerCase()}
              </span>
              {count > 0 && (
                <span className="text-[9px] font-medium mt-0.5">
                  {count}
                </span>
              )}
            </div>
          );
        })}
        {/* Flechas de navegacion integradas */}
        <div className="flex flex-col gap-1 justify-center">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97] transition-all duration-200"
            aria-label="Semana anterior"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97] transition-all duration-200"
            aria-label="Semana siguiente"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Contenido del tab */}
      {tab === 'cronograma' && (
        <div className="space-y-4">
          <ShiftGrid
            staff={staff}
            shiftTypes={shiftTypes}
            assignments={assignments}
            scheduleId={scheduleId}
            weekStr={weekStr}
            grid={grid}
            onGridChange={handleGridChange}
            readOnly={!isWeekEditable(weekStr)}
          />

          {/* Botones de accion — solo para semana actual o futura, y no en modo consolidado */}
          {area !== 'todos' && isWeekEditable(weekStr) && (
            <div className="flex items-center gap-3 justify-end flex-wrap">
              {/* Indicador de estado */}
              {scheduleId && scheduleStatus === 'published' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                  Publicado
                </span>
              )}
              {scheduleId && scheduleStatus === 'draft' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                  Borrador
                </span>
              )}
              {!scheduleId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-default)]">
                  Sin cronograma
                </span>
              )}

              {/* Guardar — siempre disponible, guarda sin publicar */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]
                  bg-[var(--color-warning)] text-white hover:bg-[var(--color-warning)]/80 disabled:opacity-50"
              >
                <FloppyDisk size={16} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>

              {/* Publicar — solo si es draft */}
              {scheduleId && scheduleStatus === 'draft' && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]
                    bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/80 disabled:opacity-50"
                >
                  <PaperPlaneTilt size={16} />
                  Publicar
                </button>
              )}
            </div>
          )}
          {!isWeekEditable(weekStr) && (
            <p className="text-xs text-[var(--text-secondary)] text-right">
              Modo solo lectura — las semanas pasadas no se pueden editar
            </p>
          )}
        </div>
      )}

      {tab === 'costos' && (
        <CostEstimationBar
          staff={staff}
          shiftTypes={shiftTypes}
          grid={grid}
          weekStr={weekStr}
          area={area}
        />
      )}

      {tab === 'referencia' && (
        <SalesReferenceTab
          key={weekStr}
          staff={staff}
          shiftTypes={shiftTypes}
          grid={grid}
          weekStr={weekStr}
          area={area}
        />
      )}

      {tab === 'horarios' && (
        <ShiftTypeEditor
          shiftTypes={shiftTypes}
          area={area}
          onRefresh={loadData}
          onNewShiftType={() => { setEditingShiftType(null); setModalOpen(true); }}
          onEditShiftType={(st) => { setEditingShiftType(st); setModalOpen(true); }}
        />
      )}

      {tab === 'personal' && (
        <StaffPanel area={area === 'todos' ? '' : area} />
      )}

      {/* Modal para crear/editar turno */}
      <ShiftTypeModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingShiftType(null); }}
        area={area as unknown as 'cocina' | 'barra' | 'servicio'}
        shiftType={editingShiftType}
        onSave={async (data) => {
          const method = editingShiftType ? 'PATCH' : 'POST';
          const res = await fetch('/api/admin/shift-type', {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Error guardando turno');
          }
          // Si el turno se creó/editó en un área distinta a la seleccionada, cambiar selector
          // (solo si no hay areaFilter bloqueando)
          if (data.area && data.area !== area && !areaFilter) {
            setArea(data.area as Area);
          }
          loadData();
        }}
      />
    </div>
  );
}

// ── Turno predefinidos por area ──
const TURNOS_PREDETERMINADOS: Record<string, { code: string; name: string; entrada: string; salida: string }[]> = {
  cocina: [
    { code: 'A', name: 'Apertura', entrada: '06:00', salida: '14:00' },
    { code: 'S', name: 'Seguido', entrada: '10:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '14:00', salida: '22:00' },
    { code: 'CD', name: 'Cierre 14h', entrada: '14:00', salida: '22:00' },
    { code: 'CS', name: 'Cierre Steward', entrada: '16:00', salida: '22:30' },
    { code: 'P1', name: 'Partido 9', entrada: '09:00', salida: '22:00' },
    { code: 'P2', name: 'Partido 10', entrada: '10:00', salida: '22:30' },
  ],
  barra: [
    { code: 'A', name: 'Apertura', entrada: '09:00', salida: '17:00' },
    { code: 'S', name: 'Seguido', entrada: '10:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '15:00', salida: '23:00' },
    { code: 'P1', name: 'Partido', entrada: '10:00', salida: '22:00' },
  ],
  servicio: [
    { code: 'A', name: 'Apertura', entrada: '09:00', salida: '16:00' },
    { code: 'S', name: 'Seguido', entrada: '11:00', salida: '22:00' },
    { code: 'C', name: 'Cierre', entrada: '16:00', salida: '23:00' },
    { code: 'P1', name: 'Partido', entrada: '11:00', salida: '22:30' },
  ],
};

// Horas en intervalos de 30 min para select
const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of ['00', '30']) {
      opts.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }
  opts.push('00:00'); // medianoche
  return opts;
})();

// Ley colombiana: nocturno = 21:00 (21) a 06:00 (6)
const NOC_INICIO = 21;
const NOC_FIN = 6;
const JORNADA_DIARIA = 8;

// Calcular horas ordinarias y nocturnas a partir de entrada/salida
function calcularHoras(entrada: string, salida: string): { ordinarias: number; nocturnas: number; total: number } {
  if (!entrada || !salida) return { ordinarias: 0, nocturnas: 0, total: 0 };
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  let entMin = eh * 60 + em;
  let salMin = sh * 60 + sm;
  if (salMin <= entMin) salMin += 1440; // cruza medianoche

  const totalMin = salMin - entMin;
  const total = Math.round((totalMin / 60) * 10) / 10;

  // Calcular minutos nocturnos (21:00-06:00 = 1260-1440 y 0-360)
  let nocMin = 0;
  for (let m = entMin; m < salMin; m += 30) {
    const h = (m / 60) % 24;
    if (h >= NOC_INICIO || h < NOC_FIN) nocMin += 30;
  }
  const nocturnas = Math.round((nocMin / 60) * 10) / 10;
  const ordinarias = Math.round((total - nocturnas) * 10) / 10;

  return { ordinarias, nocturnas, total };
}

// Componente para editar tipos de turno
function ShiftTypeEditor({
  shiftTypes: initialTypes,
  area,
  onRefresh,
  onNewShiftType,
  onEditShiftType,
}: {
  shiftTypes: ShiftType[];
  area: string;
  onRefresh: () => void;
  onNewShiftType: () => void;
  onEditShiftType: (st: ShiftType) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    entrada: '',
    salida: '',
    ordinarias: 0,
    nocturnas: 0,
    area: area,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredTypes = initialTypes.filter((t) => t.area === area);
  const presetOptions = TURNOS_PREDETERMINADOS[area] || TURNOS_PREDETERMINADOS.cocina;

  // Calculo automatico cuando cambian entrada/salida
  const horasCalc = useMemo(() => calcularHoras(form.entrada, form.salida), [form.entrada, form.salida]);

  // Actualizar ordinarias/nocturnas automaticamente
  useEffect(() => {
    if (form.entrada && form.salida && horasCalc.total > 0) {
      setForm(prev => ({ ...prev, ordinarias: horasCalc.ordinarias, nocturnas: horasCalc.nocturnas }));
    }
  }, [horasCalc.ordinarias, horasCalc.nocturnas, form.entrada, form.salida]);

  const aplicarPreset = (preset: typeof presetOptions[0]) => {
    setForm(prev => ({
      ...prev,
      code: preset.code,
      name: preset.name,
      entrada: preset.entrada,
      salida: preset.salida,
    }));
  };

  const handleNew = async () => {
    setSaving(true);
    try {
      const payload = { ...form, area };
      const res = await fetch('/api/admin/shift-type', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error creando tipo de turno');
      }
      setForm({ code: '', name: '', entrada: '', salida: '', ordinarias: 0, nocturnas: 0, area });
      setEditing(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error creando tipo de turno');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shift-type', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form, area }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error actualizando tipo de turno');
      }
      setEditing(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error actualizando tipo de turno');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shift-type?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error eliminando tipo de turno');
      }
      setConfirmDelete(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error eliminando tipo de turno');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (st: ShiftType) => {
    setEditing(st.id);
    setForm({
      code: st.code,
      name: st.name,
      entrada: st.entrada.slice(0, 5),
      salida: st.salida.slice(0, 5),
      ordinarias: st.ordinarias,
      nocturnas: st.nocturnas,
      area: st.area,
    });
  };

  // Componente Select de hora
  const TimeSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--text-secondary)]">{label}</label>
      <div className="flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs appearance-none"
        >
          <option value="">--:--</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[72px] px-1 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs text-center"
        />
      </div>
    </div>
  );

  // Resumen visual de horas calculadas
  const HorasSummary = () => {
    if (!form.entrada || !form.salida) return null;
    const esExtra = horasCalc.total > JORNADA_DIARIA;
    return (
      <div className="flex items-center gap-3 text-xs py-1.5 px-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20"
        style={esExtra ? {} : { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <span style={{ color: 'var(--text-primary)' }}>
          {form.entrada} - {form.salida}
        </span>
        <span className="font-semibold" style={{ color: esExtra ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {horasCalc.total}h total
        </span>
        <span style={{ color: 'var(--color-success)' }}>
          HO: {horasCalc.ordinarias}h
        </span>
        <span style={{ color: 'var(--color-warning)' }}>
          HN: {horasCalc.nocturnas}h
        </span>
        {esExtra && (
          <span className="font-bold" style={{ color: 'var(--color-danger)' }}>
            +{Number((horasCalc.total - JORNADA_DIARIA).toFixed(1))}h extra
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Horarios — {area.charAt(0).toUpperCase() + area.slice(1)}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewShiftType}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90"
          >
            + Nuevo horario
          </button>
        </div>
      </div>

      {/* Timeline view */}
      <ShiftTimelineView shiftTypes={initialTypes} area={area} />

      {/* Lista de tipos de turno */}
      <div className="space-y-2">
        {filteredTypes.map((st) => {
          const isEditing = editing === st.id;
          const stHoras = calcularHoras(st.entrada.slice(0, 5), st.salida.slice(0, 5));
          return (
            <div key={st.id} className="bg-[var(--bg-card)] rounded-lg p-3 space-y-3">
              {/* Vista normal */}
              {!isEditing ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[var(--text-primary)] w-8">{st.code}</span>
                    <span className="text-sm text-[var(--text-primary)]">{st.name}</span>
                    {st.is_split && st.segments && st.segments.length > 1 && (
                      <div className="text-[10px] text-[var(--color-warning)] flex flex-col">
                        {st.segments.map((seg, i) => (
                          <span key={i}>{seg.entrada}-{seg.salida}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span>{st.entrada.slice(0, 5)} - {st.salida.slice(0, 5)}</span>
                      <span className="font-semibold" style={{ color: stHoras.total > 8 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {stHoras.total}h
                      </span>
                      <span className="text-[var(--color-success)]">HO:{st.ordinarias}</span>
                      <span className={st.nocturnas > 0 ? 'text-[var(--color-warning)]' : ''}>HN:{st.nocturnas}</span>
                      {st.is_split && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-warning)]/20 text-[var(--color-warning)]">PARTIDO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditShiftType(st)}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        title="Editar"
                      >
                        <PencilSimple size={14} />
                      </button>
                      {confirmDelete === st.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(st.id)}
                            disabled={saving}
                            className="text-xs px-2 py-1 rounded bg-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/30"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(st.id)}
                          className="p-1.5 rounded hover:bg-[var(--color-danger)]/10 text-[var(--text-secondary)] hover:text-[var(--color-danger)]"
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-primary)]">{st.code}</span>
                  <span className="text-sm text-[var(--text-primary)]">{st.name}</span>
                  <span className="text-xs text-[var(--text-secondary)]">Editando...</span>
                  <button
                    onClick={() => onEditShiftType(st)}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-ak-borgona)] text-white hover:opacity-90"
                  >
                    Abrir editor
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}