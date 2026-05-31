'use client';

import { useState } from 'react';
import { WarningCircle, PaperPlaneTilt } from '@phosphor-icons/react';

interface ContingencyReportProps {
  employeeId: string;
  scheduleId?: string | null;
  onSubmitted?: () => void;
}

const NOVEDAD_TYPES = [
  { value: 'falta', label: 'No puedo asistir' },
  { value: 'tarde', label: 'Llegare tarde' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'incapacidad', label: 'Incapacidad' },
] as const;

export default function ContingencyReport({ employeeId, scheduleId, onSubmitted }: ContingencyReportProps) {
  const [type, setType] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !date) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/shift-novedades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: scheduleId,
          type,
          date,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error enviando reporte');
      }

      setSuccess(true);
      setType('');
      setDescription('');
      onSubmitted?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
        <PaperPlaneTilt size={24} className="mx-auto mb-2 text-emerald-400" />
        <p className="text-emerald-400 font-medium">Reporte enviado</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs text-[var(--text-secondary)] underline"
        >
          Enviar otro reporte
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Reportar contingencia</h3>

      {/* Tipo */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)]
            bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm
            focus:ring-1 focus:ring-[var(--color-ak-borgona)]/50"
        >
          <option value="">Seleccionar...</option>
          {NOVEDAD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)]
            bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm
            focus:ring-1 focus:ring-[var(--color-ak-borgona)]/50"
        />
      </div>

      {/* Descripcion */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">Descripcion (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)]
            bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm
            focus:ring-1 focus:ring-[var(--color-ak-borgona)]/50 resize-none"
          placeholder="Ej: Cita medica a las 10am"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <WarningCircle size={14} /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !type || !date}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium
          bg-[var(--accent-primary)] text-white hover:opacity-90
          disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Enviando...' : 'Enviar reporte'}
      </button>
    </form>
  );
}