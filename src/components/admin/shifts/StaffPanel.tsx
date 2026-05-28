'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple, Check, X, User, CaretDown, CaretRight } from '@phosphor-icons/react';
import { formatCOP } from '@/lib/utils/costCalculator';

const AREAS: { value: string; label: string; color: string }[] = [
  { value: '', label: 'Todas las areas', color: '' },
  { value: 'cocina', label: 'Cocina', color: 'var(--color-ak-borgona)' },
  { value: 'barra', label: 'Barra', color: 'var(--color-ak-dorado)' },
  { value: 'servicio', label: 'Servicio', color: 'var(--color-ak-verde, #22c55e)' },
  { value: 'apoyo', label: 'Apoyo', color: '#8b5cf6' },
  { value: 'admin', label: 'Admin', color: '#64748b' },
];

const CONTRACT_LABELS: Record<string, { label: string; className: string }> = {
  fijo: { label: 'Fijo', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  turnante: { label: 'Turnante', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

// Costo para empresa segun ley colombiana (prestaciones + aportes patronales)
// Basado en el salario real de la BD + auxilio_no_salarial + aplica_propinas
function costoEmpresaMensual(salario: number, auxilioNoSalarial: number): number {
  const primaServicios = salario * 8.33 / 100;
  const cesantias = salario * 8.33 / 100;
  const interesesCesantias = salario * 1 / 100;
  const vacaciones = salario * 4.17 / 100;
  const aporteSalud = salario * 8.5 / 100;
  const aportePension = salario * 12 / 100;
  const aporteARL = salario * 0.522 / 100;
  const aporteCaja = salario * 4 / 100;
  const aporteSena = salario * 2 / 100;
  const aporteICBF = salario * 3 / 100;
  return salario + auxilioNoSalarial + primaServicios + cesantias + interesesCesantias
    + vacaciones + aporteSalud + aportePension + aporteARL + aporteCaja + aporteSena + aporteICBF;
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
}

export default function StaffPanel({ area }: StaffPanelProps) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [filterArea, setFilterArea] = useState(area);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
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

  const resetForm = () => {
    setForm({ nombre_completo: '', cargo: '', area: area || 'cocina', contrato: 'fijo', cedula: '', correo: '', salario_mensual: 0, alias: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.nombre_completo.trim()) return;
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: form.nombre_completo, cargo: form.cargo, area: form.area, contrato: form.contrato, cedula: form.cedula || null, correo: form.correo || null, salario_mensual: form.salario_mensual, alias: form.alias || null }),
      });
      if (!res.ok) throw new Error('Error creando empleado');
      resetForm();
      fetchStaff();
    } catch (err) { console.error('Error creating staff:', err); }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre_completo: form.nombre_completo, cargo: form.cargo, area: form.area, contrato: form.contrato, cedula: form.cedula || null, correo: form.correo || null, salario_mensual: form.salario_mensual }),
      });
      if (!res.ok) throw new Error('Error actualizando empleado');
      resetForm();
      fetchStaff();
    } catch (err) { console.error('Error updating staff:', err); }
  };

  const startEdit = (member: StaffRow) => {
    setForm({ nombre_completo: member.nombre_completo, cargo: member.cargo || '', area: member.area || 'cocina', contrato: member.contrato as 'fijo' | 'turnante', cedula: member.cedula || '', correo: member.correo || '', salario_mensual: member.salario_mensual || 0, alias: member.alias || '' });
    setEditingId(member.id);
    setShowForm(true);
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
      <div className="grid grid-cols-3 gap-3">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm">
            {AREAS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
          </select>
          <span className="text-xs text-[var(--text-secondary)]">{staff.length} {staff.length === 1 ? 'persona' : 'personas'}</span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-white hover:opacity-90">
          <Plus size={14} /> Agregar persona
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-default)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre completo *</label><input type="text" value={form.nombre_completo} onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cargo</label><input type="text" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Area</label><select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm">{AREAS.filter((a) => a.value !== '').map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}</select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Contrato</label><select value={form.contrato} onChange={(e) => setForm((f) => ({ ...f, contrato: e.target.value as 'fijo' | 'turnante' }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"><option value="fijo">Fijo</option><option value="turnante">Turnante</option></select></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Cedula</label><input type="text" value={form.cedula} onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Correo</label><input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Salario mensual</label><input type="number" value={form.salario_mensual || ''} onChange={(e) => setForm((f) => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" /></div>
            <div><label className="block text-xs text-[var(--text-secondary)] mb-1">Alias</label><input type="text" value={form.alias} onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm" disabled={!!editingId} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /> Cancelar</button>
            <button onClick={editingId ? () => handleUpdate(editingId) : handleCreate} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[var(--accent-primary)] text-white hover:opacity-90"><Check size={14} /> {editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-[var(--text-secondary)] text-center py-8">Cargando...</div>
      ) : staff.length === 0 ? (
        <div className="text-[var(--text-secondary)] text-center py-8 flex flex-col items-center gap-2"><User size={32} className="opacity-30" /> No hay personal registrado</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium w-6"></th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Alias</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Nombre</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Cargo</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Area</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Modalidad</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Salario</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Aux. transp.</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Costo empresa</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Hora ord.</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">HE diurna</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Hora noct.</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">HE noct.</th>
                <th className="text-center p-3 text-[var(--text-secondary)] font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const contract = CONTRACT_LABELS[member.contrato] || CONTRACT_LABELS.fijo;
                const areaMeta = AREAS.find((a) => a.value === member.area);
                const isExpanded = expandedId === member.id;
                const costoEmp = costoEmpresaMensual(member.salario_mensual || 0, member.auxilio_no_salarial || 0);
                const vHO = valorHoraOrd(member);
                const vHED = valorHEDiurna(member);
                const vHEN = valorHENocturna(member);
                const vHN = valorHoraNocturna(member);
                const d = desglose(member);
                return (
                  <>
                    <tr key={member.id} className={`border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]/50 transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--bg-hover)]/30' : ''}`} onClick={() => setExpandedId(isExpanded ? null : member.id)}>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                      </td>
                      <td className="p-3"><span className="font-semibold text-[var(--text-primary)]">{member.alias}</span></td>
                      <td className="p-3 text-[var(--text-primary)] text-xs whitespace-nowrap">{member.nombre_completo}</td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{member.cargo || '-'}</td>
                      <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: areaMeta?.color || 'var(--text-secondary)', borderColor: areaMeta?.color || 'var(--border-default)', backgroundColor: areaMeta?.color ? `${areaMeta.color}15` : undefined }}>{areaMeta?.label || member.area || 'Sin area'}</span></td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{member.modalidad || 'COMPLETO'}{member.aplica_propinas ? ' +Prop' : ''}</td>
                      <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">{formatCOP(member.salario_mensual || 0)}</td>
                      <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">{member.auxilio_no_salarial > 0 ? formatCOP(member.auxilio_no_salarial) : '-'}</td>
                      <td className="p-3 text-right font-mono text-xs font-semibold text-[var(--accent-primary)]">{formatCOP(costoEmp)}</td>
                      <td className="p-3 text-right font-mono text-xs text-[var(--text-primary)]">{formatCOP(vHO)}</td>
                      <td className="p-3 text-right font-mono text-xs text-amber-400">{formatCOP(vHED)}</td>
                      <td className="p-3 text-right font-mono text-xs text-purple-400">{formatCOP(vHN)}</td>
                      <td className="p-3 text-right font-mono text-xs text-red-400">{formatCOP(vHEN)}</td>
                      <td className="p-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(member); }} className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><PencilSimple size={14} /></button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${member.id}-detail`} className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                        <td colSpan={14} className="p-4">
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
      )}
    </div>
  );
}