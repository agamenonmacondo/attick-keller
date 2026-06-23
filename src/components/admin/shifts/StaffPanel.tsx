'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, PencilSimple, Check, X, CaretDown, CaretRight, Prohibit, SignIn, MagnifyingGlass, Users, CaretUp } from '@phosphor-icons/react';
import { formatCOP, calcularCostoEmpresa } from '@/lib/utils/costCalculator';

const SMMLV = 1750905;
const AUXILIO_TRANSPORTE = 249095;

const AREAS: { value: string; label: string; color: string; icon: string }[] = [
  { value: 'cocina', label: 'Cocina', color: '#dc2626', icon: '🔥' },
  { value: 'barra', label: 'Barra', color: '#f59e0b', icon: '🍸' },
  { value: 'servicio', label: 'Servicio', color: '#22c55e', icon: '🍽' },
  { value: 'apoyo', label: 'Apoyo', color: '#8b5cf6', icon: '🔧' },
  { value: 'admin', label: 'Admin', color: '#64748b', icon: '📋' },
];

const AREA_ORDER = ['cocina', 'barra', 'servicio', 'apoyo', 'admin'];

function costoEmpresaMensual(salario: number, auxilioNoSalarial: number, sinAuxilioTransporte?: boolean): number {
  return calcularCostoEmpresa(salario, auxilioNoSalarial, sinAuxilioTransporte).costoMensualTotal;
}

const esSinAuxTransporte = (m: StaffRow) =>
  ((m.cargo?.toUpperCase().includes('PASANTE') ?? false) && (m.auxilio_no_salarial || 0) === 0) || (m.salario_mensual <= 1);

interface StaffPanelProps { area: string; }

interface StaffRow {
  id: string; nombre_completo: string; cargo: string | null; area: string | null;
  secondary_areas: string[]; salario_mensual: number; alias: string; sede: string;
  cedula: string | null; correo: string | null; contrato: string; activo: boolean;
  aplica_propinas: boolean; auxilio_no_salarial: number; modalidad: string | null;
  es_medio_tiempo: boolean; is_fixed_cost: boolean; is_leader: boolean;
  costo_fijo_mensual: number; fecha_ingreso: string | null;
}

interface EditFormData {
  nombre_completo: string; cargo: string; area: string; contrato: string;
  cedula: string; correo: string; salario_mensual: number; auxilio_no_salarial: number;
  modalidad: string; aplica_propinas: boolean; es_medio_tiempo: boolean;
  is_fixed_cost: boolean; is_leader: boolean; alias: string;
}

export default function StaffPanel({ area }: StaffPanelProps) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo' as 'fijo' | 'turnante',
    cedula: '', correo: '', salario_mensual: 0, alias: '',
    modalidad: 'COMPLETO', aplica_propinas: true, is_fixed_cost: false, is_leader: false,
    auxilio_no_salarial: 0, es_medio_tiempo: false,
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/nomina-staff');
      if (!res.ok) throw new Error('Error cargando personal');
      setStaff(await res.json());
    } catch (err) { console.error('Error fetching staff:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const staffByArea = useMemo(() => {
    const groups: Record<string, StaffRow[]> = {};
    for (const a of AREA_ORDER) groups[a] = [];
    for (const m of staff) { const a = m.area || 'sin_area'; if (!groups[a]) groups[a] = []; groups[a].push(m); }
    return groups;
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter(m =>
      (m.nombre_completo || '').toLowerCase().includes(q) ||
      (m.alias || '').toLowerCase().includes(q) ||
      (m.cargo || '').toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  const filteredByArea = useMemo(() => {
    const groups: Record<string, StaffRow[]> = {};
    for (const a of AREA_ORDER) groups[a] = [];
    for (const m of filteredStaff) { const a = m.area || 'sin_area'; if (!groups[a]) groups[a] = []; groups[a].push(m); }
    return groups;
  }, [filteredStaff]);

  const areaTotals = useMemo(() => {
    const totals: Record<string, { count: number; salarios: number; costoEmpresa: number }> = {};
    for (const a of AREA_ORDER) {
      const members = staffByArea[a] || [];
      totals[a] = {
        count: members.filter(m => m.activo).length,
        salarios: members.reduce((s, m) => s + (m.salario_mensual || 0), 0),
        costoEmpresa: members.reduce((s, m) => s + costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)), 0),
      };
    }
    return totals;
  }, [staffByArea]);

  const totalSalarios = staff.reduce((s, m) => s + (m.salario_mensual || 0), 0);
  const totalCostoEmpresa = staff.reduce((s, m) => s + costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)), 0);

  const toggleArea = (a: string) => {
    setCollapsedAreas(prev => { const next = new Set(prev); if (next.has(a)) next.delete(a); else next.add(a); return next; });
  };

  const startEdit = (m: StaffRow) => {
    setEditForm({
      nombre_completo: m.nombre_completo, cargo: m.cargo || '', area: m.area || 'cocina',
      contrato: m.contrato, cedula: m.cedula || '', correo: m.correo || '',
      salario_mensual: m.salario_mensual || 0, auxilio_no_salarial: m.auxilio_no_salarial || 0,
      modalidad: m.modalidad || 'COMPLETO', aplica_propinas: m.aplica_propinas,
      es_medio_tiempo: m.es_medio_tiempo, is_fixed_cost: m.is_fixed_cost, is_leader: m.is_leader,
      alias: m.alias || '',
    });
    setEditingId(m.id);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleUpdate = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId, nombre_completo: editForm.nombre_completo, cargo: editForm.cargo,
          area: editForm.area, contrato: editForm.contrato, cedula: editForm.cedula || null,
          correo: editForm.correo || null, salario_mensual: editForm.salario_mensual,
          auxilio_no_salarial: editForm.auxilio_no_salarial, modalidad: editForm.modalidad,
          aplica_propinas: editForm.aplica_propinas, es_medio_tiempo: editForm.es_medio_tiempo,
          is_fixed_cost: editForm.is_fixed_cost, is_leader: editForm.is_leader,
        }),
      });
      if (!res.ok) { alert('Error al actualizar'); return; }
      cancelEdit(); fetchStaff();
    } catch (err) { console.error('Error updating staff:', err); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!addForm.nombre_completo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          alias: addForm.alias || null,
          auxilio_no_salarial: addForm.auxilio_no_salarial,
          aplica_propinas: addForm.aplica_propinas,
          modalidad: addForm.modalidad,
          es_medio_tiempo: addForm.es_medio_tiempo,
          is_fixed_cost: addForm.is_fixed_cost,
          is_leader: addForm.is_leader,
        }),
      });
      if (!res.ok) throw new Error('Error creando empleado');
      setAddForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '', modalidad: 'COMPLETO', aplica_propinas: true, is_fixed_cost: false, is_leader: false, auxilio_no_salarial: 0, es_medio_tiempo: false });
      setShowAddForm(false); fetchStaff();
    } catch (err) { console.error('Error creating staff:', err); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (m: StaffRow) => {
    const nuevoEstado = !m.activo;
    if (!confirm(`${nuevoEstado ? 'Reactivar' : 'Desactivar'} a ${m.nombre_completo}?`)) return;
    try {
      await fetch('/api/admin/nomina-staff', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, activo: nuevoEstado }),
      });
      fetchStaff();
    } catch (err) { console.error('Error toggling activo:', err); }
  };

  const desglose = (m: StaffRow) => calcularCostoEmpresa(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m));
  const areaLabel = (a: string) => AREAS.find(ar => ar.value === a)?.label || a;
  const areaColor = (a: string) => AREAS.find(ar => ar.value === a)?.color || '#64748b';

  const ef = (field: keyof EditFormData, value: string | number | boolean) => {
    if (!editForm) return;
    setEditForm(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg px-3 py-2.5 border border-[var(--border-default)]" style={{ background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)' }}>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Costo empresa</div>
          <div className="text-base font-mono font-bold text-[var(--accent-primary)] leading-tight mt-0.5">{formatCOP(totalCostoEmpresa)}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/mes</span></div>
        </div>
        <div className="rounded-lg px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Salarios</div>
          <div className="text-base font-mono font-semibold text-[var(--text-primary)] leading-tight mt-0.5">{formatCOP(totalSalarios)}<span className="text-[10px] font-normal text-[var(--text-secondary)]">/mes</span></div>
        </div>
      </div>

      {/* Búsqueda + Agregar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, cargo..."
            className="w-full h-9 pl-8 pr-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--accent-primary)]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-[10px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap"><Users size={12} className="inline mr-0.5" />{staff.filter(m => m.activo).length}</span>
        <button onClick={() => { setAddForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '', modalidad: 'COMPLETO', aplica_propinas: true, is_fixed_cost: false, is_leader: false, auxilio_no_salarial: 0, es_medio_tiempo: false }); setShowAddForm(true); }}
          className="h-9 px-3 rounded-md text-xs font-medium bg-[var(--accent-primary)] text-white hover:opacity-90 flex items-center gap-1">
          <Plus size={14} />Agregar
        </button>
      </div>

      {/* Agregar form */}
      {showAddForm && (
        <div className="rounded-lg p-3 space-y-2 border border-[var(--accent-primary)]/40 bg-[var(--bg-card)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input type="text" placeholder="Nombre *" value={addForm.nombre_completo} onChange={e => setAddForm(f => ({ ...f, nombre_completo: e.target.value }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" />
            <input type="text" placeholder="Cargo" value={addForm.cargo} onChange={e => setAddForm(f => ({ ...f, cargo: e.target.value }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" />
            <select value={addForm.area} onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">
              {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <input type="number" placeholder="Salario mensual" value={addForm.salario_mensual || ''} onChange={e => setAddForm(f => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" />
            <input type="number" placeholder="Auxilio no salarial" value={addForm.auxilio_no_salarial || ''} onChange={e => setAddForm(f => ({ ...f, auxilio_no_salarial: Number(e.target.value) || 0 }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" />
            <select value={addForm.modalidad} onChange={e => {
              const mod = e.target.value;
              setAddForm(f => ({ ...f, modalidad: mod, aplica_propinas: !mod.toUpperCase().includes('PASANTE'), es_medio_tiempo: mod === 'MEDIO_TIEMPO' }));
            }}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">
              <option value="COMPLETO">Completo</option>
              <option value="MEDIO_TIEMPO">Medio tiempo</option>
              <option value="PASANTE LECTIVA">Pasante lectiva</option>
              <option value="PASANTE PRODUCTIVA">Pasante productiva</option>
            </select>
            <select value={addForm.contrato} onChange={e => setAddForm(f => ({ ...f, contrato: e.target.value as 'fijo' | 'turnante' }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">
              <option value="fijo">Contrato fijo</option>
              <option value="turnante">Turnante</option>
            </select>
            <input type="text" placeholder="Alias" value={addForm.alias} onChange={e => setAddForm(f => ({ ...f, alias: e.target.value }))}
              className="h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" />
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={addForm.aplica_propinas} onChange={e => setAddForm(f => ({ ...f, aplica_propinas: e.target.checked }))} className="rounded w-3.5 h-3.5" />Propinas</label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={addForm.is_fixed_cost} onChange={e => setAddForm(f => ({ ...f, is_fixed_cost: e.target.checked }))} className="rounded w-3.5 h-3.5" />Costo fijo</label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={addForm.is_leader} onChange={e => setAddForm(f => ({ ...f, is_leader: e.target.checked }))} className="rounded w-3.5 h-3.5" />Lider</label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="h-8 px-3 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="h-8 px-3 rounded text-xs bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50">{saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editingId && editForm && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={cancelEdit}>
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-default)] w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-default)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Editar {editForm.alias || editForm.nombre_completo}</h3>
                <button onClick={cancelEdit} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={16} /></button>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Nombre</label><input type="text" value={editForm.nombre_completo} onChange={e => ef('nombre_completo', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Alias</label><input type="text" value={editForm.alias} onChange={e => ef('alias', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Cargo</label><input type="text" value={editForm.cargo} onChange={e => ef('cargo', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Area</label><select value={editForm.area} onChange={e => ef('area', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">{AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Salario mensual</label><input type="number" value={editForm.salario_mensual || ''} onChange={e => ef('salario_mensual', Number(e.target.value) || 0)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Auxilio no salarial</label><input type="number" value={editForm.auxilio_no_salarial || ''} onChange={e => ef('auxilio_no_salarial', Number(e.target.value) || 0)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Contrato</label><select value={editForm.contrato} onChange={e => ef('contrato', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Modalidad</label><select value={editForm.modalidad} onChange={e => {
                    const mod = e.target.value;
                    ef('modalidad', mod);
                    if (mod.toUpperCase().includes('PASANTE')) ef('aplica_propinas', false);
                    if (mod === 'MEDIO_TIEMPO') ef('es_medio_tiempo', true);
                    else if (mod === 'COMPLETO') ef('es_medio_tiempo', false);
                  }} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="COMPLETO">Completo</option><option value="MEDIO_TIEMPO">Medio tiempo</option><option value="PASANTE LECTIVA">Pasante lectiva</option><option value="PASANTE PRODUCTIVA">Pasante productiva</option></select></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Cedula</label><input type="text" value={editForm.cedula} onChange={e => ef('cedula', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                  <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Correo</label><input type="email" value={editForm.correo} onChange={e => ef('correo', e.target.value)} className="w-full h-9 px-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={editForm.aplica_propinas} onChange={e => ef('aplica_propinas', e.target.checked)} className="rounded w-3.5 h-3.5" />Propinas</label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={editForm.is_fixed_cost} onChange={e => ef('is_fixed_cost', e.target.checked)} className="rounded w-3.5 h-3.5" />Costo fijo</label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer"><input type="checkbox" checked={editForm.is_leader} onChange={e => ef('is_leader', e.target.checked)} className="rounded w-3.5 h-3.5" />Lider</label>
                </div>
              </div>
              <div className="flex gap-2 p-3 border-t border-[var(--border-default)]">
                <button onClick={cancelEdit} className="flex-1 h-9 rounded text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
                <button onClick={handleUpdate} disabled={saving} className="flex-1 h-9 rounded text-xs bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Listado por area */}
      {loading ? (
        <div className="text-[var(--text-secondary)] text-center py-8 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-1.5">
          {AREA_ORDER.map(aKey => {
            const members = filteredByArea[aKey] || [];
            if (members.length === 0 && !searchQuery) return null;
            const totals = areaTotals[aKey];
            const isCollapsed = collapsedAreas.has(aKey);
            const color = areaColor(aKey);

            return (
              <div key={aKey} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                {/* Header del area */}
                <button
                  onClick={() => toggleArea(aKey)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-hover)]/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <CaretRight size={14} className="text-[var(--text-secondary)]" /> : <CaretDown size={14} className="text-[var(--text-secondary)]" />}
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{areaLabel(aKey)}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">{totals.count}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
                    <span>{formatCOP(totals.salarios)} sal</span>
                    <span className="text-[var(--accent-primary)] font-semibold">{formatCOP(totals.costoEmpresa)} costo</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-[var(--border-default)]/50">
                    {members.map(member => {
                      const costoEmp = costoEmpresaMensual(member.salario_mensual || 0, member.auxilio_no_salarial || 0, esSinAuxTransporte(member));
                      const d = desglose(member);
                      const isExpanded = expandedId === member.id;

                      return (
                        <div key={member.id} className={`border-b border-[var(--border-default)]/30 last:border-b-0 ${!member.activo ? 'opacity-40' : ''}`}>
                          {/* Fila principal */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)]/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : member.id)}
                          >
                            {/* Nombre y badges */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {member.is_leader && <span className="text-[10px] leading-none" style={{ color }}>★</span>}
                                {member.is_fixed_cost && !member.is_leader && <span className="text-[10px] leading-none text-[var(--color-warning)]">F</span>}
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{member.alias || member.nombre_completo}</span>
                                {!member.activo && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-400">inactivo</span>}
                                {member.aplica_propinas && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">+Prop</span>}
                                <span className="text-[10px] text-[var(--text-secondary)] hidden sm:inline">{member.cargo}</span>
                              </div>
                            </div>
                            {/* Costo */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-mono font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</div>
                              <div className="text-[10px] font-mono text-[var(--text-secondary)]">{formatCOP(member.salario_mensual || 0)}</div>
                            </div>
                            {/* Expand indicator */}
                            <div className="flex-shrink-0 text-[var(--text-secondary)]">
                              {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                            </div>
                            {/* Acciones */}
                            <div className="flex-shrink-0 flex gap-0.5" onClick={e => e.stopPropagation()}>
                              <button onClick={() => startEdit(member)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]" title="Editar"><PencilSimple size={13} /></button>
                              <button onClick={() => toggleActivo(member)} className={`p-1.5 rounded hover:bg-[var(--bg-hover)] ${member.activo ? 'text-[var(--text-secondary)]' : 'text-emerald-500'}`} title={member.activo ? 'Desactivar' : 'Reactivar'}>{member.activo ? <Prohibit size={13} /> : <SignIn size={13} />}</button>
                            </div>
                          </div>

                          {/* Desglose expandible */}
                          {isExpanded && (
                            <div className="px-3 pb-2.5 pt-0.5 bg-[var(--bg-hover)]/20">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Salario</span><span className="font-mono text-[var(--text-primary)]">{formatCOP(d.salarioMensual)}</span></div>
                                {d.auxilioTransporte > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Aux. transporte</span><span className="font-mono text-[var(--text-primary)]">{formatCOP(d.auxilioTransporte)}</span></div>}
                                {d.auxilioNoSalarial > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Aux. no salarial</span><span className="font-mono text-[var(--text-primary)]">{formatCOP(d.auxilioNoSalarial)}</span></div>}
                                <div className="col-span-2 mt-1 pt-1 border-t border-[var(--border-default)]/40"><span className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">Prestaciones</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Prima</span><span className="font-mono">{formatCOP(d.primaServicios)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Cesantias</span><span className="font-mono">{formatCOP(d.cesantias)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Int. cesantias</span><span className="font-mono">{formatCOP(d.interesesCesantias)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Vacaciones</span><span className="font-mono">{formatCOP(d.vacaciones)}</span></div>
                                <div className="col-span-2 mt-1 pt-1 border-t border-[var(--border-default)]/40"><span className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">Aportes patronales</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Pension 12%</span><span className="font-mono">{formatCOP(d.aportePension)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">ARL</span><span className="font-mono">{formatCOP(d.aporteARL)}</span></div>
                                {d.aporteSalud > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">EPS 8.5%</span><span className="font-mono">{formatCOP(d.aporteSalud)}</span></div>}
                                {d.aporteCaja > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Caja 4%</span><span className="font-mono">{formatCOP(d.aporteCaja)}</span></div>}
                                {d.aporteSena > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">SENA 2%</span><span className="font-mono">{formatCOP(d.aporteSena)}</span></div>}
                                {d.aporteICBF > 0 && <div className="flex justify-between"><span className="text-[var(--text-secondary)]">ICBF 3%</span><span className="font-mono">{formatCOP(d.aporteICBF)}</span></div>}
                                <div className="col-span-2 mt-1 pt-1 border-t border-[var(--accent-primary)]/30 flex justify-between">
                                  <span className="font-semibold text-[var(--accent-primary)]">Costo total empresa</span>
                                  <span className="font-mono font-bold text-[var(--accent-primary)]">{formatCOP(d.costoMensualTotal)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}