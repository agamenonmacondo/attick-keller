'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple, Check, X, User, CaretDown, CaretRight } from '@phosphor-icons/react';
import { formatCOP, calcularCostoEmpresa } from '@/lib/utils/costCalculator';

const AREAS: { value: string; label: string; color: string }[] = [
  { value: '', label: 'Todas las areas', color: '' },
  { value: 'cocina', label: 'Cocina', color: 'var(--color-ak-borgona)' },
  { value: 'barra', label: 'Barra', color: 'var(--color-ak-dorado)' },
  { value: 'servicio', label: 'Servicio', color: 'var(--color-ak-verde, #22c55e)' },
  { value: 'apoyo', label: 'Apoyo', color: '#8b5cf6' },
  { value: 'admin', label: 'Admin', color: '#64748b' },
];

const CONTRACT_LABELS: Record<string, { label: string; className: string }> = {
  fijo: { label: 'Fijo', className: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-emerald-500/30' },
  turnante: { label: 'Turnante', className: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-amber-500/30' },
};

// Costo para empresa segun ley colombiana (prestaciones + aportes patronales)
// Wrapper de calcularCostoEmpresa() que respeta el auxilio_no_salarial de la BD
function costoEmpresaMensual(salario: number, auxilioNoSalarial: number): number {
  const base = calcularCostoEmpresa(salario);
  // Si la BD tiene un auxilio diferente al estandar del SMLV, ajustar
  const ajusteAuxilio = auxilioNoSalarial - base.auxilioTransporte;
  return base.costoMensualTotal + ajusteAuxilio;
}

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
  fecha_ingreso: string | null;
  is_fixed_cost: boolean;
  costo_fijo_mensual: number;
  is_leader: boolean;
  rubro: string | null;
}

// Campos editables de un empleado (incluye líderes / costo fijo — Fase 4.1)
interface EditFields {
  nombre_completo: string;
  cargo: string;
  area: string;
  contrato: string;
  cedula: string;
  correo: string;
  salario_mensual: number;
  alias: string;
  aplica_propinas: boolean;
  auxilio_no_salarial: number;
  modalidad: string;
  fecha_ingreso: string;
  activo: boolean;
  is_fixed_cost: boolean;
  costo_fijo_mensual: number;
  is_leader: boolean;
  rubro: string;
}

const RUBROS = ['', 'barra', 'servicio', 'cocina'];
const MODALIDADES = ['COMPLETO', 'MEDIO_TIEMPO'];

export default function StaffPanel({ area }: StaffPanelProps) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [filterArea, setFilterArea] = useState(area);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
  const [editForm, setEditForm] = useState<Record<string, EditFields>>({});

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterArea) params.set('area', filterArea);
      const res = await fetch(`/api/admin/nomina-staff?${params}`);
      if (!res.ok) throw new Error('Error cargando personal');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, [filterArea]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { setFilterArea(area); }, [area]);

  const resetAddForm = () => {
    setAddForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '' });
    setShowAddForm(false);
  };

  const handleCreate = async () => {
    if (!addForm.nombre_completo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: addForm.nombre_completo, cargo: addForm.cargo, area: addForm.area, contrato: addForm.contrato, cedula: addForm.cedula || null, correo: addForm.correo || null, salario_mensual: addForm.salario_mensual, alias: addForm.alias || null }),
      });
      if (!res.ok) throw new Error('Error creando empleado');
      resetAddForm();
      fetchStaff();
    } catch (err) { console.error('Error creating staff:', err); }
    finally { setSaving(false); }
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
          aplica_propinas: f.aplica_propinas,
          auxilio_no_salarial: f.auxilio_no_salarial,
          modalidad: f.modalidad,
          fecha_ingreso: f.fecha_ingreso || null,
          activo: f.activo,
          is_fixed_cost: f.is_fixed_cost,
          costo_fijo_mensual: f.costo_fijo_mensual,
          is_leader: f.is_leader,
          rubro: f.rubro || null,
        }),
      });
      if (!res.ok) throw new Error('Error actualizando empleado');
      setEditingId(null);
      setEditForm(prev => { const next = { ...prev }; delete next[id]; return next; });
      fetchStaff();
    } catch (err) { console.error('Error updating staff:', err); }
    finally { setSaving(false); }
  };

  const startEdit = (member: StaffRow) => {
    setEditForm(prev => ({
      ...prev,
      [member.id]: {
        nombre_completo: member.nombre_completo,
        cargo: member.cargo || '',
        area: member.area || 'cocina',
        contrato: member.contrato,
        cedula: member.cedula || '',
        correo: member.correo || '',
        salario_mensual: member.salario_mensual || 0,
        alias: member.alias || '',
        aplica_propinas: member.aplica_propinas,
        auxilio_no_salarial: member.auxilio_no_salarial || 0,
        modalidad: member.modalidad || 'COMPLETO',
        fecha_ingreso: member.fecha_ingreso || '',
        activo: member.activo,
        is_fixed_cost: member.is_fixed_cost || false,
        costo_fijo_mensual: member.costo_fijo_mensual || 0,
        is_leader: member.is_leader || false,
        rubro: member.rubro || '',
      },
    }));
    setEditingId(member.id);
    setExpandedId(member.id);
  };

  const cancelEdit = (id: string) => {
    setEditingId(null);
    setEditForm(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // Campos avanzados editables (lider/costo fijo + datos nómina) — Fase 4.1
  const upField = (id: string, field: keyof EditFields, value: string | number | boolean) =>
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const AdvancedEditFields = ({ id }: { id: string }) => {
    const f = editForm[id];
    if (!f) return null;
    const inputCls = 'w-full min-h-[36px] px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-xs';
    const labelCls = 'block text-[10px] text-[var(--text-secondary)] mb-0.5';
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2 pt-2 border-t border-[var(--border-default)]">
        <div>
          <label className={labelCls}>Modalidad</label>
          <select value={f.modalidad} onChange={(e) => upField(id, 'modalidad', e.target.value)} className={inputCls}>
            {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Auxilio no salarial</label>
          <input type="number" value={f.auxilio_no_salarial || ''} onChange={(e) => upField(id, 'auxilio_no_salarial', Number(e.target.value) || 0)} className={inputCls + ' font-mono'} />
        </div>
        <div>
          <label className={labelCls}>Fecha ingreso</label>
          <input type="date" value={f.fecha_ingreso} onChange={(e) => upField(id, 'fecha_ingreso', e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={f.activo} onChange={(e) => upField(id, 'activo', e.target.checked)} /> Activo
          </label>
          <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={f.aplica_propinas} onChange={(e) => upField(id, 'aplica_propinas', e.target.checked)} /> Propinas
          </label>
        </div>
        <div>
          <label className={labelCls}>Líder</label>
          <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] cursor-pointer min-h-[36px]">
            <input type="checkbox" checked={f.is_leader} onChange={(e) => upField(id, 'is_leader', e.target.checked)} /> Jefe de área
          </label>
        </div>
        <div>
          <label className={labelCls}>Rubro del líder</label>
          <select value={f.rubro} onChange={(e) => upField(id, 'rubro', e.target.value)} className={inputCls}>
            {RUBROS.map(r => <option key={r} value={r}>{r || '—'}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Costo fijo (sin turno)</label>
          <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] cursor-pointer min-h-[36px]">
            <input type="checkbox" checked={f.is_fixed_cost} onChange={(e) => upField(id, 'is_fixed_cost', e.target.checked)} /> Líder fijo
          </label>
        </div>
        <div>
          <label className={labelCls}>Costo fijo mensual</label>
          <input type="number" value={f.costo_fijo_mensual || ''} onChange={(e) => upField(id, 'costo_fijo_mensual', Number(e.target.value) || 0)} className={inputCls + ' font-mono'} disabled={!f.is_fixed_cost} />
        </div>
      </div>
    );
  };

  // Totales
  const totalSalarios = staff.reduce((s, m) => s + (m.salario_mensual || 0), 0);
  const totalAuxilios = staff.reduce((s, m) => s + (m.auxilio_no_salarial || 0), 0);
  const totalCostoEmpresa = staff.reduce((s, m) => s + costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0), 0);

  // Valor hora por persona (costo empresa / 30 / 8)
  const valorHoraOrd = (m: StaffRow) => Math.round(costoEmpresaMensual(m.salario_mensual || 0, m.auxilio_no_salarial || 0) / 30 / 8);
  const valorHEDiurna = (m: StaffRow) => Math.round(valorHoraOrd(m) * 1.25);
  const valorHENocturna = (m: StaffRow) => Math.round(valorHoraOrd(m) * 1.75);
  const valorHoraNocturna = (m: StaffRow) => Math.round(valorHoraOrd(m) * 1.35);

  // Desglose detalle
  const desglose = (m: StaffRow) => {
    const s = m.salario_mensual || 0;
    const aux = m.auxilio_no_salarial || 0;
    return {
      primaServicios: Math.round(s * 8.33 / 100),
      cesantias: Math.round(s * 8.33 / 100),
      interesesCesantias: Math.round(s * 1 / 100),
      vacaciones: Math.round(s * 4.17 / 100),
      aporteSalud: Math.round(s * 8.5 / 100),
      aportePension: Math.round(s * 12 / 100),
      aporteARL: Math.round(s * 0.522 / 100),
      aporteCaja: Math.round(s * 4 / 100),
      aporteSena: Math.round(s * 2 / 100),
      aporteICBF: Math.round(s * 3 / 100),
      auxilioTransporte: aux,
    };
  };

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="text-xs text-[var(--text-secondary)]">Total salarios</div>
          <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">{formatCOP(totalSalarios)}/mes</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-default)]">
          <div className="text-xs text-[var(--text-secondary)]">Auxilios transporte</div>
          <div className="text-sm font-mono text-[var(--text-secondary)]">{formatCOP(totalAuxilios)}/mes</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--accent-primary)]/30">
          <div className="text-xs text-[var(--accent-primary)]">Costo total empresa</div>
          <div className="text-sm font-mono font-bold text-[var(--accent-primary)]">{formatCOP(totalCostoEmpresa)}/mes</div>
        </div>
      </div>

      {/* Header con filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
            {AREAS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
          </select>
          <span className="text-xs text-[var(--text-secondary)]">{staff.length} {staff.length === 1 ? 'persona' : 'personas'}</span>
        </div>
        <button onClick={() => { resetAddForm(); setShowAddForm(true); }} className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:opacity-90">
          <Plus size={14} /> Agregar persona
        </button>
      </div>

      {/* Formulario agregar */}
      {showAddForm && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-default)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre completo *</label><input type="text" value={addForm.nombre_completo} onChange={(e) => setAddForm((f) => ({ ...f, nombre_completo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cargo</label><input type="text" value={addForm.cargo} onChange={(e) => setAddForm((f) => ({ ...f, cargo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Area</label><select value={addForm.area} onChange={(e) => setAddForm((f) => ({ ...f, area: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">{AREAS.filter((a) => a.value !== '').map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}</select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Contrato</label><select value={addForm.contrato} onChange={(e) => setAddForm((f) => ({ ...f, contrato: e.target.value as 'fijo' | 'turnante' }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cedula</label><input type="text" value={addForm.cedula} onChange={(e) => setAddForm((f) => ({ ...f, cedula: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Correo</label><input type="email" value={addForm.correo} onChange={(e) => setAddForm((f) => ({ ...f, correo: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            {addForm.contrato === 'turnante' ? (
              <>
                <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Pago por turno (COP)</label><input type="number" value={addForm.salario_mensual || ''} onChange={(e) => setAddForm((f) => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" placeholder="Dejar 0 para usar SMLV" /><p className="text-[10px] text-[var(--text-muted)] mt-0.5">Si es 0, se usa SMLV ($1.750.905)</p></div>
              </>
            ) : (
              <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Salario mensual</label><input type="number" value={addForm.salario_mensual || ''} onChange={(e) => setAddForm((f) => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
            )}
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Alias</label><input type="text" value={addForm.alias} onChange={(e) => setAddForm((f) => ({ ...f, alias: e.target.value }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetAddForm} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /> Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"><Check size={14} /> {saving ? 'Creando...' : 'Crear'}</button>
          </div>
        </div>
      )}

      {/* ===== VISTA MOBILE: Tarjetas ===== */}
      {loading ? (
        <div className="text-[var(--text-secondary)] text-center py-8">Cargando...</div>
      ) : staff.length === 0 ? (
        <div className="text-[var(--text-secondary)] text-center py-8 flex flex-col items-center gap-2"><User size={32} className="opacity-30" /> No hay personal registrado</div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {staff.map((member) => {
              const areaMeta = AREAS.find((a) => a.value === member.area);
              const isExpanded = expandedId === member.id;
              const isEditing = editingId === member.id;
              const ef = editForm[member.id];
              const costoEmp = costoEmpresaMensual(member.salario_mensual || 0, member.auxilio_no_salarial || 0);
              const vHO = valorHoraOrd(member);
              const d = desglose(member);
              return (
                <div key={member.id} className="bg-[var(--bg-card)] rounded-lg overflow-hidden">
                  <button
                    onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : member.id); }}
                    className="w-full text-left p-3 flex items-start justify-between gap-2 min-h-[44px]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)] text-sm">{isEditing ? ef?.alias || member.alias : member.alias}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: areaMeta?.color || 'var(--text-secondary)', borderColor: areaMeta?.color || 'var(--border-default)', backgroundColor: areaMeta?.color ? `${areaMeta.color}15` : undefined }}>{areaMeta?.label || member.area || 'Sin area'}</span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">{member.cargo || '-'} &middot; {member.modalidad || 'COMPLETO'}{member.aplica_propinas ? ' +Prop' : ''}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</div>
                      <div className="font-mono text-xs text-[var(--text-secondary)]">Sal: {formatCOP(member.salario_mensual || 0)}</div>
                    </div>
                  </button>
                  {isExpanded && !isEditing && (
                    <div className="px-3 pb-3 border-t border-[var(--border-default)] pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-[var(--text-secondary)]">Hora ord.</span> <span className="font-mono text-[var(--text-primary)]">{formatCOP(vHO)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Aux. transp.</span> <span className="font-mono text-[var(--text-primary)]">{member.auxilio_no_salarial > 0 ? formatCOP(member.auxilio_no_salarial) : '-'}</span></div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                        <div><span className="text-[var(--text-secondary)]">Prima (8.33%)</span> <span className="font-mono">{formatCOP(d.primaServicios)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">EPS (8.5%)</span> <span className="font-mono">{formatCOP(d.aporteSalud)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Pension (12%)</span> <span className="font-mono">{formatCOP(d.aportePension)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Cesantias (8.33%)</span> <span className="font-mono">{formatCOP(d.cesantias)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">ARL (0.522%)</span> <span className="font-mono">{formatCOP(d.aporteARL)}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Caja (4%)</span> <span className="font-mono">{formatCOP(d.aporteCaja)}</span></div>
                      </div>
                      <button onClick={() => startEdit(member)} className="flex items-center gap-1 text-xs text-[var(--accent-primary)] min-h-[44px]"><PencilSimple size={14} /> Editar</button>
                    </div>
                  )}
                  {isExpanded && isEditing && ef && (
                    <div className="px-3 pb-3 border-t border-[var(--border-default)] pt-2 space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre completo</label><input type="text" value={ef.nombre_completo} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], nombre_completo: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                        <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Alias</label><input type="text" value={ef.alias} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], alias: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cargo</label><input type="text" value={ef.cargo} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], cargo: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Area</label><select value={ef.area} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], area: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm">{AREAS.filter(a => a.value !== '').map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Contrato</label><select value={ef.contrato} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], contrato: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Salario</label><input type="number" value={ef.salario_mensual || ''} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], salario_mensual: Number(e.target.value) || 0 } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cedula</label><input type="text" value={ef.cedula} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], cedula: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                          <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Correo</label><input type="email" value={ef.correo} onChange={(e) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], correo: e.target.value } }))} className="w-full min-h-[44px] px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm" /></div>
                        </div>
                      </div>
                      <AdvancedEditFields id={member.id} />
                      <div className="flex gap-2 sticky bottom-0 bg-[var(--bg-card)] pt-2 pb-1">
                        <button onClick={() => cancelEdit(member.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /> Cancelar</button>
                        <button onClick={() => handleUpdate(member.id)} disabled={saving} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm min-h-[44px] bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50"><Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== VISTA DESKTOP: Tabla ===== */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium w-6"></th>
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Alias</th>
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Nombre</th>
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Cargo</th>
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Area</th>
                  <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Contrato</th>
                  <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Salario</th>
                  <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Costo empresa</th>
                  <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Hora ord.</th>
                  <th className="text-center p-3 text-[var(--text-secondary)] font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const areaMeta = AREAS.find((a) => a.value === member.area);
                  const isExpanded = expandedId === member.id;
                  const isEditing = editingId === member.id;
                  const ef = editForm[member.id];
                  const costoEmp = costoEmpresaMensual(member.salario_mensual || 0, member.auxilio_no_salarial || 0);
                  const vHO = valorHoraOrd(member);
                  const d = desglose(member);
                  const upEF = (field: string, value: string | number) => setEditForm(prev => ({ ...prev, [member.id]: { ...prev[member.id], [field]: value } }));
                  return (
                    <>
                      <tr key={member.id} className={`border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]/50 transition-colors ${isExpanded ? 'bg-[var(--bg-hover)]/30' : ''} ${isEditing ? 'bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]/30' : ''}`}>
                        <td className="p-3 text-[var(--text-secondary)] cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : member.id)}>
                          {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                        </td>
                        {isEditing && ef ? (
                          <>
                            <td className="p-1"><input type="text" value={ef.alias} onChange={(e) => upEF('alias', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-sm font-semibold" /></td>
                            <td className="p-1"><input type="text" value={ef.nombre_completo} onChange={(e) => upEF('nombre_completo', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs" /></td>
                            <td className="p-1"><input type="text" value={ef.cargo} onChange={(e) => upEF('cargo', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs" /></td>
                            <td className="p-1"><select value={ef.area} onChange={(e) => upEF('area', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs">{AREAS.filter(a => a.value !== '').map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></td>
                            <td className="p-1"><select value={ef.contrato} onChange={(e) => upEF('contrato', e.target.value)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></td>
                            <td className="p-1"><input type="number" value={ef.salario_mensual || ''} onChange={(e) => upEF('salario_mensual', Number(e.target.value) || 0)} className="w-full min-h-[36px] px-2 py-1 rounded border border-[var(--accent-primary)]/50 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-mono text-right" /></td>
                            <td className="p-3 text-right font-mono text-xs font-semibold text-[var(--accent-primary)]">-</td>
                            <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">-</td>
                            <td className="p-1 flex gap-1 justify-center">
                              <button onClick={() => handleUpdate(member.id)} disabled={saving} className="p-1.5 rounded bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50 min-h-[36px] min-w-[36px]"><Check size={14} /></button>
                              <button onClick={() => cancelEdit(member.id)} className="p-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px] min-w-[36px]"><X size={14} /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3"><span className="font-semibold text-[var(--text-primary)]">{member.alias}</span></td>
                            <td className="p-3 text-[var(--text-primary)] text-xs whitespace-nowrap">{member.nombre_completo}</td>
                            <td className="p-3 text-xs text-[var(--text-secondary)]">{member.cargo || '-'}</td>
                            <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: areaMeta?.color || 'var(--text-secondary)', borderColor: areaMeta?.color || 'var(--border-default)', backgroundColor: areaMeta?.color ? `${areaMeta.color}15` : undefined }}>{areaMeta?.label || member.area || 'Sin area'}</span></td>
                            <td className="p-3 text-xs text-[var(--text-secondary)]">{CONTRACT_LABELS[member.contrato]?.label || member.contrato}</td>
                            <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">{formatCOP(member.salario_mensual || 0)}</td>
                            <td className="p-3 text-right font-mono text-xs font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</td>
                            <td className="p-3 text-right font-mono text-xs text-[var(--text-primary)]">{formatCOP(vHO)}</td>
                            <td className="p-3 text-center">
                              <button onClick={(e) => { e.stopPropagation(); startEdit(member); }} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px] min-w-[36px]"><PencilSimple size={14} /></button>
                            </td>
                          </>
                        )}
                      </tr>
                      {isEditing && (
                        <tr key={`${member.id}-edit-detail`} className="border-b border-[var(--border-default)] bg-[var(--accent-primary)]/5">
                          <td colSpan={10} className="p-3">
                            <AdvancedEditFields id={member.id} />
                          </td>
                        </tr>
                      )}
                      {isExpanded && !isEditing && (
                        <tr key={`${member.id}-detail`} className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                          <td colSpan={10} className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                              <div><span className="text-[var(--text-secondary)]">Prima de servicios (8.33%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.primaServicios)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Cesantias (8.33%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.cesantias)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Intereses cesantias (1%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.interesesCesantias)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Vacaciones (4.17%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.vacaciones)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">EPS patronal (8.5%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aporteSalud)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Pension patronal (12%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aportePension)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">ARL (0.522%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aporteARL)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Caja compensacion (4%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aporteCaja)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">SENA (2%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aporteSena)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">ICBF (3%)</span><div className="font-mono text-[var(--text-primary)]">{formatCOP(d.aporteICBF)}/mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Auxilio transporte</span><div className="font-mono text-[var(--text-primary)]">{d.auxilioTransporte > 0 ? formatCOP(d.auxilioTransporte) : '-'} /mes</div></div>
                              <div><span className="text-[var(--text-secondary)]">Propinas</span><div className="font-mono text-[var(--text-primary)]">{member.aplica_propinas ? 'Si' : 'No'}</div></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}