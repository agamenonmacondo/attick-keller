'use client'

import { Timer, ClockAfternoon } from '@phosphor-icons/react'
import { formatDate, formatTime } from '@/lib/utils/formatDate'

interface MiTurnoHoursProps {
  hoursData: {
    employee_id: string
    week_str: string
    total_worked_hours: number
    daily: { date: string; checkin: string | null; checkout: string | null; hours: number; type?: string; description?: string }[]
  } | null
  weekStr: string
}

const NOVEDAD_LABELS: Record<string, string> = {
  falta: 'Falta',
  tarde: 'Llegada tarde',
  permiso: 'Permiso',
  incapacidad: 'Incapacidad',
  vacaciones: 'Vacaciones',
}

export function MiTurnoHours({ hoursData, weekStr }: MiTurnoHoursProps) {
  const daily = hoursData?.daily ?? []
  const total = hoursData?.total_worked_hours ?? 0

  // Sin registros
  if (daily.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <Timer size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">Sin registros de horas</p>
        <p className="text-sm mt-1">Aún no has registrado check-in/out esta semana.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Total de la semana */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center border border-[var(--color-ak-borgona)]/20">
        <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)] mb-1">Horas trabajadas · {weekStr}</div>
        <div className="text-5xl font-mono font-bold text-[var(--color-ak-borgona)] tabular-nums">
          {total}<span className="text-2xl ml-1">h</span>
        </div>
      </div>

      {/* Lista diaria */}
      <div className="space-y-2">
        {daily.map((d, i) => (
          <div key={i} className="bg-[var(--bg-card)] rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] capitalize">{formatDate(d.date, 'weekday')}</div>
                {d.checkin && d.checkout ? (
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                    <ClockAfternoon size={12} />
                    {new Date(d.checkin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    <span className="opacity-60">→</span>
                    {new Date(d.checkout).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : d.type ? (
                  <div className="text-xs text-[var(--color-warning)] mt-0.5">
                    {NOVEDAD_LABELS[d.type] || d.type}
                    {d.description ? ` · ${d.description}` : ''}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">Sin registro</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-mono font-semibold text-[var(--text-primary)] tabular-nums">{d.hours}h</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}