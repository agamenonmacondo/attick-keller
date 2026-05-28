'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, PencilSimple, Check, X, User } from '@phosphor-icons/react';
import { formatCOP } from '@/lib/utils/costCalculator';
import type { StaffMember } from '@/lib/types/shifts';

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

interface StaffPanelProps {
  area: string;
}

export default function StaffPanel({ area }: StaffPanelProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filterArea, setFilterArea] = useState(area);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    setFilterArea(area);
  }, [area]);

  const resetForm = () => {
    setForm({
      nombre_completo: '',
      cargo: '',
      area: area || 'cocina',
      contrato: 'fijo',
      cedula: '',
      correo: '',
      salario_mensual: 0,
      alias: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.nombre_completo.trim()) return;
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: form.nombre_completo,
          cargo: form.cargo,
          area: form.area,
          contrato: form.contrato,
          cedula: form.cedula || null,
          correo: form.correo || null,
          salario_mensual: form.salario_mensual,
          alias: form.alias || null,
        }),
      });
      if (!res.ok) throw new Error('Error creando empleado');
      resetForm();
      fetchStaff();
    } catch (err) {
      console.error('Error creating staff:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch('/api/admin/nomina-staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          nombre_completo: form.nombre_completo,
          cargo: form.cargo,
          area: form.area,
          contrato: form.contrato,
          cedula: form.cedula || null,
          correo: form.correo || null,
          salario_mensual: form.salario_mensual,
        }),
      });
      if (!res.ok) throw new Error('Error actualizando empleado');
      resetForm();
      fetchStaff();
    } catch (err) {
      console.error('Error updating staff:', err);
    }
  };

  const startEdit = (member: StaffMember) => {
    setForm({
      nombre_completo: member.nombre_completo,
      cargo: member.cargo || '',
      area: member.area,
      contrato: member.contrato,
      cedula: member.cedula || '',
      correo: member.correo || '',
      salario_mensual: member.salario_mensual || 0,
      alias: member.alias || '',
    });
    setEditingId(member.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Header con filtro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm"
          >
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <span className="text-xs text-[var(--text-secondary)]">
            {staff.length} {staff.length === 1 ? 'persona' : 'personas'}
          </span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-[var(--accent-primary)] text-white hover:opacity-90"
        >
          <Plus size={14} />
          Agregar persona
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-default)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Nombre completo *</label>
              <input
                type="text"
                value={form.nombre_completo}
                onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Cargo</label>
              <input
                type="text"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Area</label>
              <select
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              >
                {AREAS.filter((a) => a.value !== '').map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Contrato</label>
              <select
                value={form.contrato}
                onChange={(e) => setForm((f) => ({ ...f, contrato: e.target.value as 'fijo' | 'turnante' }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              >
                <option value="fijo">Fijo</option>
                <option value="turnante">Turnante</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Cedula</label>
              <input
                type="text"
                value={form.cedula}
                onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Correo</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Salario mensual</label>
              <input
                type="number"
                value={form.salario_mensual || ''}
                onChange={(e) => setForm((f) => ({ ...f, salario_mensual: Number(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Alias</label>
              <input
                type="text"
                value={form.alias}
                onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
                disabled={!!editingId}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
              Cancelar
            </button>
            <button
              onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[var(--accent-primary)] text-white hover:opacity-90"
            >
              <Check size={14} />
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-[var(--text-secondary)] text-center py-8">Cargando...</div>
      ) : staff.length === 0 ? (
        <div className="text-[var(--text-secondary)] text-center py-8 flex flex-col items-center gap-2">
          <User size={32} className="opacity-30" />
          No hay personal registrado
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Alias</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Nombre completo</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Cedula</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Correo</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Area</th>
                <th className="text-left p-3 text-[var(--text-secondary)] font-medium">Contrato</th>
                <th className="text-right p-3 text-[var(--text-secondary)] font-medium">Salario</th>
                <th className="text-center p-3 text-[var(--text-secondary)] font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const contract = CONTRACT_LABELS[member.contrato] || CONTRACT_LABELS.fijo;
                const areaMeta = AREAS.find((a) => a.value === member.area);
                return (
                  <tr
                    key={member.id}
                    className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]/50 transition-colors"
                  >
                    <td className="p-3">
                      <span className="font-semibold text-[var(--text-primary)]">{member.alias}</span>
                    </td>
                    <td className="p-3 text-[var(--text-primary)]">{member.nombre_completo}</td>
                    <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">
                      {member.cedula || '-'}
                    </td>
                    <td className="p-3 text-xs text-[var(--text-secondary)]">
                      {member.correo || '-'}
                    </td>
                    <td className="p-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border"
                        style={{
                          color: areaMeta?.color || 'var(--text-secondary)',
                          borderColor: areaMeta?.color || 'var(--border-default)',
                          backgroundColor: areaMeta?.color ? `${areaMeta.color}15` : undefined,
                        }}
                      >
                        {areaMeta?.label || member.area}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${contract.className}`}>
                        {contract.label}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-[var(--text-primary)]">
                      {formatCOP(member.salario_mensual || 0)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => startEdit(member)}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <PencilSimple size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
