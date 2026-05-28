'use client';

import { useState, useCallback, useEffect } from 'react';
import { CaretLeft, CaretRight, FloppyDisk, PaperPlaneTilt, ClockClockwise, ChartBar, PencilSimple, IdentificationBadge, Trash, Clock } from '@phosphor-icons/react';
import { SectionHeading } from '../shared/SectionHeading';
import { supabase } from '@/lib/supabase/client';
import type { ShiftType, StaffMemberForShift, ShiftAssignment } from '@/lib/types/shifts';
import { getWeekStr, getWeekDates, calcularCostoTurno } from '@/lib/utils/costCalculator';
import ShiftGrid from './ShiftGrid';
import CostEstimationBar from './CostEstimationBar';
import PerformanceDashboard from './PerformanceDashboard';
import StaffPanel from './StaffPanel';
import ShiftTimelineView from './ShiftTimelineView';

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
    // Verificar si hay turnos en la grilla
    const hasAssignments = Object.values(grid).some(days => Object.keys(days).length > 0);
    if (!hasAssignments) {
      alert('No hay turnos asignados para guardar.');
      return;
    }

    setSaving(true);
    try {
      let schedId = scheduleId;

      // Crear cronograma si no existe
      if (!schedId) {
        try {
          const res = await fetch('/api/admin/shift-schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area, week_str: weekStr }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Error creando cronograma (${res.status})`);
          }
          const data = await res.json();
          schedId = data.id;
          setScheduleId(data.id);
          setScheduleStatus('draft');
        } catch (err) {
          console.error('Error creating schedule:', err);
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

      const res = await fetch('/api/admin/shift-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: schedId, assignments: payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error guardando asignaciones (${res.status})`);
      }

      // Recargar datos para sincronizar
      await loadData();
      alert('Asignaciones guardadas correctamente');
    } catch (err) {
      console.error('Error saving:', err);
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
  const [timelineMode, setTimelineMode] = useState(false);
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
      const res = await fetch(`/api/admin/shift-type?id=${id}`, { method: 'DELETE' });
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
            onClick={() => setTimelineMode(!timelineMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${timelineMode
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-hover)]'
              }`}
            title={timelineMode ? 'Vista lista' : 'Vista simultanea'}
          >
            <Clock size={14} />
            {timelineMode ? 'Lista' : 'Simultanea'}
          </button>
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
      {timelineMode && (
        <ShiftTimelineView shiftTypes={initialTypes} area={area} />
      )}

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
                            className="text-xs px-2 py-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(st.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulario de edición */
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    Editando: {st.code} — {st.name}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Codigo</label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
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
                      onClick={() => handleEdit(st.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"
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
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}