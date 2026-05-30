'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CaretLeft, CaretRight, FloppyDisk, PaperPlaneTilt, ClockClockwise, ChartBar, PencilSimple, IdentificationBadge, Trash } from '@phosphor-icons/react';
import { SectionHeading } from '../shared/SectionHeading';

import type { ShiftType, StaffMemberForShift, ShiftAssignment } from '@/lib/types/shifts';
import { getWeekStr, getWeekDates, dayIndexToDateIndex, calcularCostoTurno } from '@/lib/utils/costCalculator';
import { getLocalDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/lib/ThemeProvider';
import ShiftGrid from './ShiftGrid';
import CostEstimationBar from './CostEstimationBar';
import StaffPanel from './StaffPanel';
import ShiftTimelineView from './ShiftTimelineView';

type Area = 'cocina' | 'barra' | 'servicio';
type Tab = 'cronograma' | 'costos' | 'horarios' | 'personal';

const AREAS: { value: Area; label: string }[] = [
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'servicio', label: 'Servicio' },
];

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getHeatClasses(count: number, isDark: boolean): { bg: string; text: string } {
  if (isDark) {
    if (count === 0) return { bg: 'bg-[var(--bg-input)]', text: 'text-[var(--text-muted)]' };
    if (count <= 2) return { bg: 'bg-[var(--color-ak-borgona)]/25', text: 'text-[var(--border-light)]' };
    if (count <= 5) return { bg: 'bg-[var(--color-ak-borgona)]/45', text: 'text-white' };
    return { bg: 'bg-[var(--color-ak-borgona)]/70', text: 'text-white' };
  }
  if (count === 0) return { bg: 'bg-[var(--bg-input)]', text: 'text-[var(--text-secondary)]' };
  if (count <= 2) return { bg: 'bg-[var(--color-ak-borgona)]/15', text: 'text-[var(--text-primary)]' };
  if (count <= 5) return { bg: 'bg-[var(--color-ak-borgona)]/35', text: 'text-[var(--text-primary)]' };
  return { bg: 'bg-[var(--color-ak-borgona)]/60', text: 'text-white' };
}

export default function ShiftSchedulePanel() {
  const [area, setArea] = useState<Area>('cocina');
  const [tab, setTab] = useState<Tab>('cronograma');
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

  // Compute heatmap days from assignments
  const days = useMemo(() => {
    const d: Record<string, number> = {};
    const weekDates = getWeekDates(weekStr);
    for (const a of assignments) {
      const dateIndex = dayIndexToDateIndex(a.day_index);
      const date = weekDates[dateIndex];
      if (date) {
        const dateStr = date.toISOString().split('T')[0];
        d[dateStr] = (d[dateStr] || 0) + 1;
      }
    }
    return d;
  }, [assignments, weekStr]);

  // Calendar state: derive viewYear/viewMonth from weekStr's middle date (Thursday)
  const weekDates = useMemo(() => getWeekDates(weekStr), [weekStr]);
  const selectedWeekThursday = weekDates[3]; // Thursday of the selected week
  const [viewYear, setViewYear] = useState(selectedWeekThursday.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedWeekThursday.getMonth());

  const today = useMemo(() => getLocalDate(), []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 12 : viewMonth + 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: d, inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: d, inMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 2 > 12 ? 1 : viewMonth + 2;
      const y = viewMonth + 2 > 12 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: d, inMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Determine which dates belong to the selected week for ring highlight
  const selectedWeekDates = useMemo(() => {
    return new Set(weekDates.map(d => d.toISOString().split('T')[0]));
  }, [weekDates]);

  const handlePrevMonth = () => {
    const newDate = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
  };

  const handleToday = () => {
    setWeekStr(getWeekStr(new Date()));
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Bloquear semanas pasadas — solo semana actual y futuras
  const currentWeekStr = useMemo(() => getWeekStr(new Date()), []);
  const isWeekEditable = (wStr: string) => wStr >= currentWeekStr;

  const handleDayClick = (dateStr: string) => {
    // Convert clicked date to weekStr — use noon to avoid timezone issues
    const [y, m, d] = dateStr.split('-').map(Number);
    const clickedDate = new Date(y, m - 1, d, 12, 0, 0);
    const clickedWeek = getWeekStr(clickedDate);
    // Solo permitir semana actual y futuras
    if (clickedWeek < currentWeekStr) return;
    setWeekStr(clickedWeek);
    // Update view to month of clicked date
    setViewYear(clickedDate.getFullYear());
    setViewMonth(clickedDate.getMonth());
  };

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shift-schedules?area=${area}&week_str=${weekStr}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando datos');
      const data = await res.json();

      setShiftTypes(data.shift_types || []);
      setStaff(data.staff || []);
      setAssignments(data.assignments || []);
      setScheduleId(data.schedule?.id || null);
      setScheduleStatus(data.schedule?.status || 'draft');

      // Inicializar grid desde asignaciones — only when data comes from server (not local edits)
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
      const payload: { employee_id: string; day_index: number; shift_code: string; estimated_hours: number | null; estimated_cost: number | null }[] = [];

      for (const [empId, days] of Object.entries(grid)) {
        for (const [dayIdx, code] of Object.entries(days)) {
          if (!code || code === 'OFF') continue;
          const st = shiftTypes.find((t) => t.code === code);
          const emp = staff.find((e) => e.id === empId);
          if (!st || !emp) continue;

          const hours = st.ordinarias + st.nocturnas;
          const isSunday = Number(dayIdx) === 0;
          const cost = calcularCostoTurno(st, emp.salario_mensual, isSunday);

          payload.push({
            employee_id: empId,
            day_index: Number(dayIdx),
            shift_code: code,
            estimated_hours: hours,
            estimated_cost: cost.total,
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
      console.log('[Turnos] Asignaciones guardadas:', result);

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
        {/* Selector de area */}
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as Area)}
          className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
        >
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {/* Status badge */}
        <span className={`text-xs px-2 py-1 rounded-full
          ${scheduleStatus === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
        >
          {scheduleStatus === 'published' ? 'Publicado' : 'Borrador'}
        </span>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 ml-auto">
          {[
            { id: 'cronograma' as Tab, icon: <ClockClockwise size={14} />, label: 'Cronograma' },
            { id: 'costos' as Tab, icon: <ChartBar size={14} />, label: 'Costos' },
            { id: 'horarios' as Tab, icon: <PencilSimple size={14} />, label: 'Horarios' },
            { id: 'personal' as Tab, icon: <IdentificationBadge size={14} />, label: 'Personal' },
          ].map((t) => (
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
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            aria-label="Mes anterior"
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <div className="flex items-center gap-3">
            <span className="font-['Playfair_Display'] text-base font-semibold text-[var(--text-primary)]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-lg px-2.5 py-1 text-[10px] font-medium border border-[var(--color-ak-borgona)]/30 text-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10 active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            >
              Hoy
            </button>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
            style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
            aria-label="Mes siguiente"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-[var(--text-secondary)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — using plain buttons to avoid motion animation interference */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell) => {
            const count = days[cell.date] || 0;
            const isInSelectedWeek = selectedWeekDates.has(cell.date);
            const isToday = cell.date === today;
            const isWeekend = (() => {
              const [y, m, d] = cell.date.split('-').map(Number);
              const dow = new Date(y, m - 1, d).getDay();
              return dow === 0 || dow === 6;
            })();
            const [cy, cm, cd] = cell.date.split('-').map(Number);
            const cellWeek = getWeekStr(new Date(cy, cm - 1, cd, 12, 0, 0));
            const isPastWeek = cellWeek < currentWeekStr;
            const heat = getHeatClasses(count, isDark);

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => handleDayClick(cell.date)}
                disabled={isPastWeek}
                className={cn(
                  'relative rounded-lg py-1.5 text-center text-xs font-medium transition-all duration-100',
                  !isPastWeek && 'cursor-pointer active:scale-[0.95]',
                  heat.bg,
                  heat.text,
                  !cell.inMonth && 'opacity-40',
                  isPastWeek && 'opacity-30 cursor-not-allowed',
                  isInSelectedWeek && cell.inMonth && !isPastWeek && 'ring-2 ring-[var(--color-ak-borgona)] ring-offset-1 ring-offset-[var(--bg-card)]',
                  isWeekend && cell.inMonth && !isPastWeek && 'font-semibold',
                )}
                title={isPastWeek ? 'Semana pasada' : count > 0 ? `${count} turnos asignados` : 'Sin turnos'}
              >
                {cell.day}
                {isToday && !isInSelectedWeek && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--color-ak-borgona)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--bg-input)]" />
            <span className="text-[9px] text-[var(--text-secondary)]">0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-ak-borgona)]/15" />
            <span className="text-[9px] text-[var(--text-secondary)]">1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-ak-borgona)]/35" />
            <span className="text-[9px] text-[var(--text-secondary)]">3-5</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-ak-borgona)]/60" />
            <span className="text-[9px] text-[var(--text-secondary)]">6+</span>
          </div>
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
          />

          {/* Botones de accion — solo para semana actual o futura */}
          {isWeekEditable(weekStr) && (
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]
                  bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)]
                  hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                <FloppyDisk size={16} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              {scheduleId && scheduleStatus === 'draft' && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]
                    bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <PaperPlaneTilt size={16} />
                  Publicar cronograma
                </button>
              )}
              {scheduleId && scheduleStatus === 'published' && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]
                    bg-[var(--color-ak-borgona)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  <FloppyDisk size={16} />
                  Guardar y notificar
                </button>
              )}
            </div>
          )}
          {!isWeekEditable(weekStr) && (
            <p className="text-xs text-[var(--text-secondary)] text-right">
              No se pueden editar semanas pasadas
            </p>
          )}
          {scheduleId && scheduleStatus === 'published' && (
            <p className="text-xs text-[var(--text-secondary)] text-right">
              Cronograma publicado
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
        />
      )}

      {tab === 'horarios' && (
        <ShiftTypeEditor
          shiftTypes={shiftTypes}
          area={area}
          onRefresh={loadData}
        />
      )}

      {tab === 'personal' && (
        <StaffPanel area={area} />
      )}
    </div>
  );
}

// Componente para editar tipos de turno
function ShiftTypeEditor({
  shiftTypes: initialTypes,
  area,
  onRefresh,
}: {
  shiftTypes: ShiftType[];
  area: string;
  onRefresh: () => void;
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

  const handleNew = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shift-schedules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_shift_type', ...form }),
      });
      if (!res.ok) throw new Error('Error creando tipo de turno');
      setForm({ code: '', name: '', entrada: '', salida: '', ordinarias: 0, nocturnas: 0, area });
      setEditing(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error creando tipo de turno');
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
        body: JSON.stringify({ id, ...form }),
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
      entrada: st.entrada.slice(0, 5), // HH:MM from HH:MM:00
      salida: st.salida.slice(0, 5),
      ordinarias: st.ordinarias,
      nocturnas: st.nocturnas,
      area: st.area,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Horarios — {area.charAt(0).toUpperCase() + area.slice(1)}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setForm({ code: '', name: '', entrada: '', salida: '', ordinarias: 0, nocturnas: 0, area });
              setEditing('new');
            }}
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
          return (
            <div key={st.id} className="bg-[var(--bg-card)] rounded-lg p-3 space-y-3">
              {/* Vista normal */}
              {!isEditing ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-[var(--text-primary)] w-8">{st.code}</span>
                    <span className="text-sm text-[var(--text-primary)]">{st.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span>{st.entrada.slice(0, 5)} - {st.salida.slice(0, 5)}</span>
                      <span>{st.ordinarias + st.nocturnas}h</span>
                      <span className={st.ordinarias > 0 ? 'text-emerald-400' : ''}>
                        HO:{st.ordinarias}
                      </span>
                      <span className={st.nocturnas > 0 ? 'text-amber-400' : ''}>
                        HN:{st.nocturnas}
                      </span>
                      {st.ordinarias + st.nocturnas > 8 && (
                        <span className="text-red-400 font-bold">+HE</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(st)}
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
                            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
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
                          className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="Codigo"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nombre"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                    <input
                      value={form.entrada}
                      onChange={(e) => setForm({ ...form, entrada: e.target.value })}
                      placeholder=" Entrada HH:MM"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                    <input
                      value={form.salida}
                      onChange={(e) => setForm({ ...form, salida: e.target.value })}
                      placeholder="Salida HH:MM"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                    <input
                      type="number"
                      value={form.ordinarias}
                      onChange={(e) => setForm({ ...form, ordinarias: Number(e.target.value) })}
                      placeholder="Ordinarias"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                    <input
                      type="number"
                      value={form.nocturnas}
                      onChange={(e) => setForm({ ...form, nocturnas: Number(e.target.value) })}
                      placeholder="Nocturnas"
                      className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleEdit(st.id)}
                      disabled={saving}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-ak-borgona)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nuevo turno */}
      {editing === 'new' && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Codigo"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
            <input
              value={form.entrada}
              onChange={(e) => setForm({ ...form, entrada: e.target.value })}
              placeholder="Entrada HH:MM"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
            <input
              value={form.salida}
              onChange={(e) => setForm({ ...form, salida: e.target.value })}
              placeholder="Salida HH:MM"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
            <input
              type="number"
              value={form.ordinarias}
              onChange={(e) => setForm({ ...form, ordinarias: Number(e.target.value) })}
              placeholder="Ordinarias"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
            <input
              type="number"
              value={form.nocturnas}
              onChange={(e) => setForm({ ...form, nocturnas: Number(e.target.value) })}
              placeholder="Nocturnas"
              className="px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(null)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              onClick={handleNew}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-ak-borgona)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}