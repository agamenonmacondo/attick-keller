'use client'

import { ClockAfternoon, ClockClockwise, Coffee, WarningCircle } from '@phosphor-icons/react'
import { getWeekDates, dayIndexToDateIndex } from '@/lib/utils/costCalculator'
import { getLocalDate, formatTime } from '@/lib/utils/formatDate'
import { DAY_NAMES } from '@/lib/types/shifts'
import type { ShiftType, ShiftAssignment } from '@/lib/types/shifts'
import { cn } from '@/lib/utils/cn'

interface MiTurnoScheduleProps {
  assignments: ShiftAssignment[]
  shiftTypes: ShiftType[]
  weekStr: string
  schedule: { id: string; week_str: string; status: string } | null
}

// date index (0=Lun..6=Dom) → BD day_index (0=Dom, 1=Lun..6=Sab)
function dateIndexToDayIndex(i: number): number {
  return i === 6 ? 0 : i + 1
}

const NOVEDAD_LABELS: Record<string, string> = {
  falta: 'Falta',
  tarde: 'Llegada tarde',
  permiso: 'Permiso',
  incapacidad: 'Incapacidad',
  vacaciones: 'Vacaciones',
  turnante: 'Turnante',
}

export function MiTurnoSchedule({ assignments, shiftTypes, weekStr, schedule }: MiTurnoScheduleProps) {
  const weekDates = getWeekDates(weekStr)
  const todayStr = getLocalDate()

  // Sin cronograma
  if (!schedule) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <ClockClockwise size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">No hay cronograma para esta semana</p>
        <p className="text-sm mt-1">Contacta a tu líder de área.</p>
      </div>
    )
  }

  // Cronograma en borrador — las asignaciones no son definitivas
  if (schedule.status === 'draft') {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <ClockClockwise size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">El cronograma aún no está publicado</p>
        <p className="text-sm mt-1">Vuelve más tarde para ver tus turnos definitivos.</p>
      </div>
    )
  }

  const assignmentMap = new Map(assignments.map(a => [a.day_index, a]))

  // Sin turnos asignados
  if (assignments.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <Coffee size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">No tienes turnos asignados</p>
        <p className="text-sm mt-1">Disfruta tu descanso esta semana.</p>
      </div>
    )
  }

  // Totales
  let totalHours = 0
  for (const a of assignments) totalHours += a.estimated_hours || 0

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {weekDates.map((date, i) => {
          const dayIndex = dateIndexToDayIndex(i)
          const assignment = assignmentMap.get(dayIndex)
          const st = assignment ? shiftTypes.find(t => t.code === assignment.shift_code) : null
          const isToday = getLocalDate(date) === todayStr

          return (
            <div
              key={i}
              className={cn(
                'bg-[var(--bg-card)] rounded-xl p-3.5 flex items-center justify-between gap-3 border',
                isToday ? 'border-[var(--color-ak-borgona)]/50 ring-1 ring-[var(--color-ak-borgona)]/20' : 'border-transparent',
                !assignment && 'opacity-50'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 shrink-0 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">{DAY_NAMES[dayIndex]}</div>
                  <div className="text-base font-mono font-semibold text-[var(--text-primary)]">
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                  {isToday && <div className="text-[9px] text-[var(--color-ak-borgona)] font-medium">HOY</div>}
                </div>

                {assignment && st ? (
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {st.code} — {st.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
                      <ClockAfternoon size={12} />
                      <span>{formatTime(st.entrada)} – {formatTime(st.salida)}</span>
                      <span className="opacity-60">·</span>
                      <span>{st.ordinarias + st.nocturnas}h</span>
                    </div>
                    {assignment.novedad && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
                        <WarningCircle size={10} />
                        {NOVEDAD_LABELS[assignment.novedad] || assignment.novedad}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)]">Descanso</div>
                )}
              </div>

              {/* Badges check-in/out */}
              {assignment && (
                <div className="text-right shrink-0 text-[11px]">
                  {assignment.checkin_at && (
                    <div className="text-[var(--color-success)]">
                      IN {new Date(assignment.checkin_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {assignment.checkout_at && (
                    <div className="text-blue-400">
                      OUT {new Date(assignment.checkout_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">Horas totales de la semana</span>
        <span className="text-lg font-mono font-semibold text-[var(--color-ak-borgona)]">{totalHours}h</span>
      </div>
    </div>
  )
}