'use client';

import { useState, useCallback, useEffect } from 'react';
import { CaretLeft, CaretRight, FloppyDisk, PaperPlaneTilt, ClockClockwise, ChartBar, PencilSimple, IdentificationBadge } from '@phosphor-icons/react';
import { SectionHeading } from '../shared/SectionHeading';
import { supabase } from '@/lib/supabase/client';
import type { ShiftType, StaffMemberForShift, ShiftAssignment } from '@/lib/types/shifts';
import { getWeekStr, getWeekDates, calcularCostoTurno } from '@/lib/utils/costCalculator';
import ShiftGrid from './ShiftGrid';
import CostEstimationBar from './CostEstimationBar';
import PerformanceDashboard from './PerformanceDashboard';
import StaffPanel from './StaffPanel';

type Area = 'cocina' | 'barra' | 'servicio';
type Tab = 'cronograma' | 'costos' | 'performance' | 'horarios' | 'personal';

const AREAS: { value: Area; label: string }[] = [
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'servicio', label: 'Servicio' },
];

export default function ShiftSchedulePanel() {
  const [area, setArea] = useState<Area>('cocina');
  const [tab, setTab] = useState<Tab>('cronograma');
  const [weekOffset, setWeekOffset] = useState(0);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [staff, setStaff] = useState<StaffMemberForShift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<string>('draft');
  const [saving, setSaving] = useState(false);
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>({});

  // Semana actual
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + weekOffset * 7);
  const weekStr = getWeekStr(targetDate);

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shift-schedules?area=${area}&week_str=${weekStr}`);
      if (!res.ok) throw new Error('Error cargando datos');
      const data = await res.json();

      setShiftTypes(data.shift_types || []);
      setStaff(data.staff || []);
      setAssignments(data.assignments || []);
      setScheduleId(data.schedule?.id || null);
      setScheduleStatus(data.schedule?.status || 'draft');

      // Inicializar grid desde asignaciones
      const initialGrid: Record<string, Record<number, string>> = {};
      for (const s of data.staff || []) {
        initialGrid[s.id] = {};
      }
      for (const a of data.assignments || []) {
        if (!initialGrid[a.employee_id]) initialGrid[a.employee_id] = {};
        initialGrid[a.employee_id][a.day_index] = a.shift_code;
      }
      setGrid(initialGrid);
    } catch (err) {
      console.error('Error loading shift data:', err);
    }
  }, [area, weekStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guardar asignaciones
  const handleSave = async () => {
    if (!scheduleId) {
      // Crear cronograma primero
      try {
        const res = await fetch('/api/admin/shift-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ area, week_str: weekStr }),
        });
        if (!res.ok) throw new Error('Error creando cronograma');
        const data = await res.json();
        setScheduleId(data.id);
        setScheduleStatus('draft');

        // Ahora guardar asignaciones
        await saveAssignments(data.id);
      } catch (err) {
        console.error('Error creating schedule:', err);
      }
    } else {
      await saveAssignments(scheduleId);
    }
  };

  const saveAssignments = async (schedId: string) => {
    setSaving(true);
    try {
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

      const res = await fetch('/api/admin/shift-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: schedId, assignments: payload }),
      });

      if (!res.ok) throw new Error('Error guardando asignaciones');
      alert('Asignaciones guardadas');
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error guardando asignaciones');
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
      });
      if (!res.ok) throw new Error('Error publicando');
      setScheduleStatus('published');
      alert('Cronograma publicado');
    } catch (err) {
      console.error('Error publishing:', err);
    }
  };

  // Cambios en la grilla
  const handleGridChange = useCallback((newGrid: Record<string, Record<number, string>>) => {
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
          className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
        >
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {/* Navegacion de semana */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
          >
            <CaretLeft size={16} />
          </button>
          <span className="text-sm font-mono text-[var(--text-primary)] min-w-[100px] text-center">
            {weekStr}
          </span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
          >
            <CaretRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-[var(--text-secondary)] underline"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Status badge */}
        <span className={`text-xs px-2 py-1 rounded-full
          ${scheduleStatus === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
        >
          {scheduleStatus === 'published' ? 'Publicado' : 'Borrador'}
        </span>

        {/* Tabs */}
        <div className="flex gap-1 ml-auto">
          {[
            { id: 'cronograma' as Tab, icon: <ClockClockwise size={14} />, label: 'Cronograma' },
            { id: 'costos' as Tab, icon: <ChartBar size={14} />, label: 'Costos' },
            { id: 'performance' as Tab, icon: <ChartBar size={14} />, label: 'Performance' },
            { id: 'horarios' as Tab, icon: <PencilSimple size={14} />, label: 'Horarios' },
            { id: 'personal' as Tab, icon: <IdentificationBadge size={14} />, label: 'Personal' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
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

      {/* Contenido del tab */}
      {tab === 'cronograma' && (
        <div className="space-y-4">
          <ShiftGrid
            staff={staff}
            shiftTypes={shiftTypes}
            assignments={assignments}
            scheduleId={scheduleId}
            weekStr={weekStr}
            onAssignmentsChange={handleGridChange}
          />

          {/* Botones de accion */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)]
                hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              <FloppyDisk size={16} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {scheduleId && scheduleStatus !== 'published' && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  bg-[var(--accent-primary)] text-white hover:opacity-90"
              >
                <PaperPlaneTilt size={16} />
                Publicar
              </button>
            )}
          </div>
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

      {tab === 'performance' && (
        <PerformanceDashboard
          area={area}
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

  const filteredTypes = initialTypes.filter((t) => t.area === area);

  const handleNew = async () => {
    try {
      const res = await fetch('/api/admin/shift-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_shift_type', ...form }),
      });
      if (!res.ok) throw new Error('Error creando tipo de turno');
      setForm({ code: '', name: '', entrada: '', salida: '', ordinarias: 0, nocturnas: 0, area });
      setEditing(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Horarios — {area.charAt(0).toUpperCase() + area.slice(1)}
        </h3>
        <button
          onClick={() => setEditing('new')}
          className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90"
        >
          + Nuevo horario
        </button>
      </div>

      {/* Lista de tipos de turno */}
      <div className="space-y-2">
        {filteredTypes.map((st) => (
          <div key={st.id} className="bg-[var(--bg-card)] rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-[var(--text-primary)] w-8">{st.code}</span>
              <span className="text-sm text-[var(--text-primary)]">{st.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span>{st.entrada} - {st.salida}</span>
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
          </div>
        ))}
      </div>

      {/* Formulario para nuevo tipo */}
      {editing === 'new' && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-default)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Nuevo horario</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Codigo</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm font-mono uppercase"
                placeholder="EJ"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
                placeholder="Ej: Cierre Especial"
              />
            </div>
            <div className="col-span-1" />
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Entrada (HH:MM)</label>
              <input
                type="time"
                value={form.entrada}
                onChange={(e) => setForm((f) => ({ ...f, entrada: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Salida (HH:MM)</label>
              <input
                type="time"
                value={form.salida}
                onChange={(e) => setForm((f) => ({ ...f, salida: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div className="col-span-1" />
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Horas ordinarias (HO)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.ordinarias}
                onChange={(e) => setForm((f) => ({ ...f, ordinarias: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Horas nocturnas (HN)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.nocturnas}
                onChange={(e) => setForm((f) => ({ ...f, nocturnas: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              onClick={handleNew}
              className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent-primary)] text-white"
            >
              Crear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}