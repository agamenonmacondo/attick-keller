'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, PencilSimple, Check, X, CaretDown, CaretRight, Prohibit, SignIn, Trash, MagnifyingGlass, Users } from '@phosphor-icons/react';
import { formatCOP, calcularCostoEmpresa } from '@/lib/utils/costCalculator';

const SMMLV = 1750905;
const AUXILIO_TRANSPORTE = 249095;

const AREAS: { value: string; label: string; color: string }[] = [
  { value: 'cocina', label: 'Cocina', color: 'var(--color-ak-borgona)' },
  { value: 'barra', label: 'Barra', color: 'var(--color-ak-dorado)' },
  { value: 'servicio', label: 'Servicio', color: 'var(--color-ak-verde, #22c55e)' },
  { value: 'apoyo', label: 'Apoyo', color: '#8b5cf6' },
  { value: 'admin', label: 'Admin', color: '#64748b' },
];

const AREA_ORDER = ['cocina', 'barra', 'servicio', 'apoyo', 'admin'];

const CONTRACT_LABELS: Record<string, { label: string; className: string }> = {
  fijo: { label: 'Fijo', className: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-emerald-500/30' },
  turnante: { label: 'Turnante', className: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-amber-500/30' },
};

function costoEmpresaMensual(salario: number, auxilioNoSalarial: number, sinAuxilioTransporte?: boolean): number {
  const costo = calcularCostoEmpresa(salario, auxilioNoSalarial, sinAuxilioTransporte);
  return costo.costoMensualTotal;
}

const esSinAuxTransporte = (m: StaffRow) =>
  ((m.cargo?.toUpperCase().includes('PASANTE') ?? false) && (m.auxilio_no_salarial || 0) === 0) || (m.salario_mensual <= 1);

interface StaffPanelProps {
  area: string;
}

interface StaffRow {
  id: string;
  nombre_completo: string;
  cargo: string | null;
  area: string | null;
  secondary_areas: string[];
  salario_mensual: number;
  alias: string;
  sede: string;
  cedula: string | null;
  correo: string | null;
  contrato: string;
  activo: boolean;
  aplica_propinas: boolean;
  auxilio_no_salarial: number;
  modalidad: string | null;
  es_medio_tiempo: boolean;
  is_fixed_cost: boolean;
  is_leader: boolean;
  costo_fijo_mensual: number;
  fecha_ingreso: string | null;
}

export default function StaffPanel({ area }: StaffPanelProps) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, {
    nombre_completo: string;
    cargo: string;
    area: string;
    contrato: string;
    cedula: string;
    correo: string;
    salario_mensual: number;
    auxilio_no_salarial: number;
    modalidad: string;
    aplica_propinas: boolean;
    es_medio_tiempo: boolean;
    is_fixed_cost: boolean;
    is_leader: boolean;
    alias: string;
  }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    nombre_completo: '',
    cargo: '',
    area: area || 'cocina',
    contrato: 'fijo' as 'fijo' | 'turnante',
    cedula: '',
    correo: '',
    salario_mensual: 0,
    alias: '',
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/nomina-staff');
      if (!res.ok) throw new Error('Error cargando personal');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Group staff by area
  const staffByArea = useMemo(() => {
    const groups: Record<string, StaffRow[]> = {};
    for (const a of AREA_ORDER) groups[a] = [];
    for (const m of staff) {
      const a = m.area || 'sin_area';
      if (!groups[a]) groups[a] = [];
      groups[a].push(m);
    }
    return groups;
  }, [staff]);

  // Filter by search
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
    for (const m of filteredStaff) {
      const a = m.area || 'sin_area';
      if (!groups[a]) groups[a] = [];
      groups[a].push(m);
    }
    return groups;
  }, [filteredStaff]);

  // Area totals
  const areaTotals = useMemo(() => {
    const totals: Record<string, { count: number; salarios: number; costoEmpresa: number; auxTransporte: number; auxNoSalarial: number }> = {};
    for (const a of AREA_ORDER) {
      const members = staffByArea[a] || [];
      totals[a] = {
        count: members.filter(m => m.activo).length,
        salarios: members.reduce((s, m) => s + (m.salario_mensual || 0), 0),
        costoEmpresa: members.reduce((s, m) => s + costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)), 0),
        auxTransporte: members.reduce((s, m) => s + calcularCostoEmpresa(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)).auxilioTransporte, 0),
        auxNoSalarial: members.reduce((s, m) => s + (m.auxilio_no_salarial || 0), 0),
      };
    }
    return totals;
  }, [staffByArea]);

  const totalSalarios = staff.reduce((s, m) => s + (m.salario_mensual || 0), 0);
  const totalCostoEmpresa = staff.reduce((s, m) => s + costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)), 0);
  const totalAuxTransporte = staff.reduce((s, m) => s + calcularCostoEmpresa(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m)).auxilioTransporte, 0);
  const totalAuxNoSalarial = staff.reduce((s, m) => s + (m.auxilio_no_salarial || 0), 0);

  const toggleArea = (a: string) => {
    setCollapsedAreas(prev => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a); else next.add(a);
      return next;
    });
  };

  const startEdit = (m: StaffRow) => {
    setEditForm(prev => ({
      ...prev,
      [m.id]: {
        nombre_completo: m.nombre_completo,
        cargo: m.cargo || '',
        area: m.area || 'cocina',
        contrato: m.contrato,
        cedula: m.cedula || '',
        correo: m.correo || '',
        salario_mensual: m.salario_mensual || 0,
        auxilio_no_salarial: m.auxilio_no_salarial || 0,
        modalidad: m.modalidad || 'COMPLETO',
        aplica_propinas: m.aplica_propinas,
        es_medio_tiempo: m.es_medio_tiempo,
        is_fixed_cost: m.is_fixed_cost,
        is_leader: m.is_leader,
        alias: m.alias || '',
      },
    }));
    setEditingId(m.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async (id: string) => {
    const f = editForm[id];
    if (!f) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nombre_completo: f.nombre_completo,
          cargo: f.cargo,
          area: f.area,
          contrato: f.contrato,
          cedula: f.cedula || null,
          correo: f.correo || null,
          salario_mensual: f.salario_mensual,
          auxilio_no_salarial: f.auxilio_no_salarial,
          modalidad: f.modalidad,
          aplica_propinas: f.aplica_propinas,
          es_medio_tiempo: f.es_medio_tiempo,
          is_fixed_cost: f.is_fixed_cost,
          is_leader: f.is_leader,
        }),
      });
      if (!res.ok) throw new Error('Error actualizando');
      cancelEdit();
      fetchStaff();
    } catch (err) {
      console.error('Error updating staff:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!addForm.nombre_completo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: addForm.nombre_completo,
          cargo: addForm.cargo,
          area: addForm.area,
          contrato: addForm.contrato,
          cedula: addForm.cedula || null,
          correo: addForm.correo || null,
          salario_mensual: addForm.salario_mensual,
          alias: addForm.alias || null,
          auxilio_no_salarial: addForm.salario_mensual > 0 && addForm.salario_mensual <= SMMLV * 2 ? AUXILIO_TRANSPORTE : 0,
        }),
      });
      if (!res.ok) throw new Error('Error creando empleado');
      setAddForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '' });
      setShowAddForm(false);
      fetchStaff();
    } catch (err) {
      console.error('Error creating staff:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (m: StaffRow) => {
    const nuevoEstado = !m.activo;
    if (!confirm(`${nuevoEstado ? 'Reactivar' : 'Desactivar'} a ${m.nombre_completo}?`)) return;
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, activo: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error');
      fetchStaff();
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  const deleteMember = async (m: StaffRow) => {
    if (!confirm(`¿Eliminar permanentemente a ${m.nombre_completo}?`)) return;
    try {
      const res = await fetch(`/api/admin/nomina-staff?id=${m.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchStaff();
    } catch (err) {
      console.error('Error deleting staff:', err);
    }
  };

  const desglose = (m: StaffRow) => {
    const costo = calcularCostoEmpresa(m.salario_mensual || 0, m.auxilio_no_salarial || 0, esSinAuxTransporte(m));
    return costo;
  };

  const upEF = (id: string, field: string, value: string | number | boolean) =>
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const areaLabel = (a: string) => AREAS.find(ar => ar.value === a)?.label || a;
  const areaColor = (a: string) => AREAS.find(ar => ar.value === a)?.color || '#64748b';

  return (
    <div className="space-y-4">
      {/* RESUMEN GLOBAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="text-xs text-[var(--text-secondary)]">Total salarios</div>
          <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">{formatCOP(totalSalarios)}/mes</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="text-xs text-[var(--text-secondary)]">Auxilios transporte</div>
          <div className="text-sm font-mono text-[var(--text-secondary)]">{formatCOP(totalAuxTransporte)}/mes</div>
        </div>
        {totalAuxNoSalarial > 0 && (
          <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
            <div className="text-xs text-[var(--text-secondary)]">Auxilio no salarial</div>
            <div className="text-sm font-mono text-[var(--text-secondary)]">{formatCOP(totalAuxNoSalarial)}/mes</div>
          </div>
        )}
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--accent-primary)]/30">
          <div className="text-xs text-[var(--accent-primary)]">Costo total empresa</div>
          <div className="text-sm font-mono font-bold text-[var(--accent-primary)]">{formatCOP(totalCostoEmpresa)}/mes</div>
        </div>
      </div>

      {/* BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar colaborador..."
            className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1"><Users size={14} /> {staff.filter(m => m.activo).length} activos / {staff.length} total</span>
        <button onClick={() => { setAddForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '' }); setShowAddForm(true); }} className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:opacity-90">
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* FORMULARIO AGREGAR */}
      {showAddForm && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-default)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre completo *</label><input type="text" value={addForm.nombre_completo} onChange={e => setAddForm(f => ({ ...f, nombre_completo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cargo</label><input type="text" value={addForm.cargo} onChange={e => setAddForm(f => ({ ...f, cargo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Area</label><select value={addForm.area} onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">{AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Contrato</label><select value={addForm.contrato} onChange={e => setAddForm(f => ({ ...f, contrato: e.target.value as 'fijo' | 'turnante' }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cedula</label><input type="text" value={addForm.cedula} onChange={e => setAddForm(f => ({ ...f, cedula: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Correo</label><input type="email" value={addForm.correo} onChange={e => setAddForm(f => ({ ...f, correo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Salario mensual</label><input type="number" value={addForm.salario_mensual || ''} onChange={e => setAddForm(f => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Alias</label><input type="text" value={addForm.alias} onChange={e => setAddForm(f => ({ ...f, alias: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /> Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"><Check size={14} /> {saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </div>
      )}

      {/* LISTADO POR ÁREA */}
      {loading ? (
        <div className="text-[var(--text-secondary)] text-center py-8">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {AREA_ORDER.map(aKey => {
            const members = filteredByArea[aKey] || [];
            if (members.length === 0 && !searchQuery) return null;
            const totals = areaTotals[aKey];
            const isCollapsed = collapsedAreas.has(aKey);
            const color = areaColor(aKey);

            return (
              <div key={aKey} className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                {/* HEADER DE ÁREA — clic para colapsar/expandir */}
                <button
                  onClick={() => toggleArea(aKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)]/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <CaretRight size={16} className="text-[var(--text-secondary)]" /> : <CaretDown size={16} className="text-[var(--text-secondary)]" />}
                    <span className="text-sm font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ color, borderColor: color, backgroundColor: `${color}15` }}>
                      {areaLabel(aKey)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{totals.count} {totals.count === 1 ? 'persona' : 'personas'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-[var(--text-secondary)]">Sal: <span className="text-[var(--text-primary)] font-medium">{formatCOP(totals.salarios)}</span></div>
                    <div className="text-[var(--text-secondary)]">Costo: <span className="text-[var(--accent-primary)] font-medium">{formatCOP(totals.costoEmpresa)}</span></div>
                  </div>
                </button>

                {/* FILAS DE PERSONAS — solo visible si no está colapsado */}
                {!isCollapsed && (
                  <div className="border-t border-[var(--border-default)]">
                    {/* Desktop header */}
                    <div className="hidden md:grid grid-cols-[2rem_1fr_1fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-1 px-4 py-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-default)]">
                      <div></div>
                      <div>Nombre</div>
                      <div>Cargo</div>
                      <div>Salario</div>
                      <div>Aux. No Sal.</div>
                      <div>Costo Empresa</div>
                      <div>Modalidad</div>
                      <div>Acciones</div>
                    </div>
                    {members.map(member => {
                      const isEditing = editingId === member.id;
                      const ef = editForm[member.id];
                      const costoEmp = costoEmpresaMensual(member.salario_mensual || 0, member.auxilio_no_salarial || 0, esSinAuxTransporte(member));
                      const d = desglose(member);

                      if (isEditing && ef) {
                        return (
                          <div key={member.id} className="bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]/20 px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Nombre</label><input type="text" value={ef.nombre_completo} onChange={e => upEF(member.id, 'nombre_completo', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Alias</label><input type="text" value={ef.alias} onChange={e => upEF(member.id, 'alias', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Cargo</label><input type="text" value={ef.cargo} onChange={e => upEF(member.id, 'cargo', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Area</label><select value={ef.area} onChange={e => upEF(member.id, 'area', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">{AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Salario</label><input type="number" value={ef.salario_mensual || ''} onChange={e => upEF(member.id, 'salario_mensual', Number(e.target.value) || 0)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" /></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Auxilio no salarial</label><input type="number" value={ef.auxilio_no_salarial || ''} onChange={e => upEF(member.id, 'auxilio_no_salarial', Number(e.target.value) || 0)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-mono" /></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Contrato</label><select value={ef.contrato} onChange={e => upEF(member.id, 'contrato', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
                              <div><label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Modalidad</label><select value={ef.modalidad} onChange={e => upEF(member.id, 'modalidad', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="COMPLETO">Completo</option><option value="MEDIO_TIEMPO">Medio tiempo</option></select></div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer"><input type="checkbox" checked={ef.aplica_propinas} onChange={e => upEF(member.id, 'aplica_propinas', e.target.checked)} className="rounded border-[var(--border-default)]" />Propinas</label>
                                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer"><input type="checkbox" checked={ef.is_fixed_cost} onChange={e => upEF(member.id, 'is_fixed_cost', e.target.checked)} className="rounded border-[var(--border-default)]" />Costo fijo</label>
                                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer"><input type="checkbox" checked={ef.is_leader} onChange={e => upEF(member.id, 'is_leader', e.target.checked)} className="rounded border-[var(--border-default)]" />Líder</label>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[36px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /> Cancelar</button>
                              <button onClick={() => handleUpdate(member.id)} disabled={saving} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[36px] bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"><Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                          </div>
                        );
                      }

                      // NON-EDITING ROW
                      return (
                        <div key={member.id} className={`grid grid-cols-1 md:grid-cols-[2rem_1fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-1 px-4 py-2.5 border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/30 transition-colors items-center ${!member.activo ? 'opacity-50' : ''}`}>
                          {/* Desktop layout */}
                          <div className="hidden md:contents">
                            <div className="text-[var(--text-secondary)] flex items-center justify-center">
                              {member.is_leader && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">★</span>}
                              {member.is_fixed_cost && !member.is_leader && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">F</span>}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text-primary)] text-sm">{member.alias}</span>
                              <span className="text-xs text-[var(--text-secondary)] ml-1">{member.nombre_completo}</span>
                              {!member.activo && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30">Inactivo</span>}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">{member.cargo || '-'}</div>
                            <div className="font-mono text-xs text-[var(--text-secondary)]">{formatCOP(member.salario_mensual || 0)}</div>
                            <div className="font-mono text-xs text-[var(--text-secondary)]">{member.auxilio_no_salarial > 0 ? formatCOP(member.auxilio_no_salarial) : '-'}</div>
                            <div className="font-mono text-xs font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</div>
                            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${CONTRACT_LABELS[member.contrato]?.className || ''}`}>{CONTRACT_LABELS[member.contrato]?.label || member.contrato}</span>
                              <span className="text-[10px]">{member.modalidad || 'COMPLETO'}</span>
                              {member.aplica_propinas && <span className="text-[10px] text-[var(--color-warning)]">+Prop</span>}
                            </div>
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => startEdit(member)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px] min-w-[36px]"><PencilSimple size={14} /></button>
                              <button onClick={() => toggleActivo(member)} className={`p-1.5 rounded hover:bg-[var(--bg-hover)] min-h-[36px] min-w-[36px] ${member.activo ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`} title={member.activo ? 'Desactivar' : 'Reactivar'}>{member.activo ? <Prohibit size={14} /> : <SignIn size={14} />}</button>
                              <button onClick={() => deleteMember(member)} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--color-danger)] min-h-[36px] min-w-[36px]" title="Eliminar"><Trash size={14} /></button>
                            </div>
                          </div>

                          {/* Mobile layout */}
                          <div className="md:hidden">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-[var(--text-primary)] text-sm">{member.alias}</span>
                                {!member.activo && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)]">Inactivo</span>}
                                <div className="text-xs text-[var(--text-secondary)]">{member.cargo || '-'} · {member.modalidad || 'COMPLETO'}{member.aplica_propinas ? ' +Prop' : ''}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</div>
                                <div className="font-mono text-xs text-[var(--text-secondary)]">Sal: {formatCOP(member.salario_mensual || 0)}</div>
                              </div>
                            </div>
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => startEdit(member)} className="p-1.5 rounded text-[var(--accent-primary)] text-xs"><PencilSimple size={14} /></button>
                              <button onClick={() => toggleActivo(member)} className={`p-1.5 rounded text-xs ${member.activo ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>{member.activo ? <Prohibit size={14} /> : <SignIn size={14} />}</button>
                            </div>
                          </div>
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