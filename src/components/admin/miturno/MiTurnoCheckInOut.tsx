'use client'

import { ClockAfternoon, ClockClockwise, Coffee, MapPin } from '@phosphor-icons/react'
import { getWeekDates } from '@/lib/utils/costCalculator'
import { getLocalDate, formatTime } from '@/lib/utils/formatDate'
import { DAY_NAMES } from '@/lib/types/shifts'
import type { ShiftType, ShiftAssignment } from '@/lib/types/shifts'
import CheckInOut from '@/components/admin/shifts/CheckInOut'

interface MiTurnoCheckInOutProps {
  assignments: ShiftAssignment[]
  shiftTypes: ShiftType[]
  weekStr: string
  onCheckinUpdate: (updates: { assignmentId: string; checkinAt?: string | null; checkoutAt?: string | null }) => void
}

function dateIndexToDayIndex(i: number): number {
  return i === 6 ? 0 : i + 1
}

export function MiTurnoCheckInOut({ assignments, shiftTypes, weekStr, onCheckinUpdate }: MiTurnoCheckInOutProps) {
  const weekDates = getWeekDates(weekStr)
  const todayStr = getLocalDate()

  // Buscar el turno de hoy
  let todayAssignment: ShiftAssignment | null = null
  for (let i = 0; i < weekDates.length; i++) {
    if (getLocalDate(weekDates[i]) === todayStr) {
      const dayIndex = dateIndexToDayIndex(i)
      todayAssignment = assignments.find(a => a.day_index === dayIndex) ?? null
      break
    }
  }

  // Sin cronograma / sin turnos
  if (assignments.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <Coffee size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">No tienes turnos asignados</p>
        <p className="text-sm mt-1">No hay nada que registrar hoy.</p>
      </div>
    )
  }

  // Hoy es descanso
  if (!todayAssignment) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
        <Coffee size={44} className="mx-auto mb-3 opacity-30" />
        <p className="text-[var(--text-primary)] font-medium">Hoy no tienes turno</p>
        <p className="text-sm mt-1">Disfruta tu descanso.</p>
      </div>
    )
  }

  const st = shiftTypes.find(t => t.code === todayAssignment.shift_code)

  return (
    <div className="space-y-4">
      {/* Info del turno de hoy */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--color-ak-borgona)]/30">
        <div className="flex items-center gap-2 mb-3">
          <ClockClockwise size={18} className="text-[var(--color-ak-borgona)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Turno de hoy</h3>
        </div>
        {st ? (
          <div className="space-y-1.5">
            <div className="font-medium text-[var(--text-primary)]">{st.code} — {st.name}</div>
            <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
              <ClockAfternoon size={14} />
              <span>{formatTime(st.entrada)} – {formatTime(st.salida)}</span>
              <span className="opacity-60">·</span>
              <span>{st.ordinarias + st.nocturnas}h</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--text-secondary)]">Turno {todayAssignment.shift_code}</div>
        )}

        {/* Estado de check-in/out */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className={todayAssignment.checkin_at ? 'text-[var(--color-success)]' : 'text-[var(--text-secondary)] opacity-50'} />
            <span className={todayAssignment.checkin_at ? 'text-[var(--color-success)]' : 'text-[var(--text-secondary)]'}>
              {todayAssignment.checkin_at
                ? `IN ${new Date(todayAssignment.checkin_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sin check-in'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className={todayAssignment.checkout_at ? 'text-blue-400' : 'text-[var(--text-secondary)] opacity-50'} />
            <span className={todayAssignment.checkout_at ? 'text-blue-400' : 'text-[var(--text-secondary)]'}>
              {todayAssignment.checkout_at
                ? `OUT ${new Date(todayAssignment.checkout_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sin check-out'}
            </span>
          </div>
        </div>
      </div>

      {/* Botones de check-in/out (reutiliza el componente existente con geolocalización) */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4">
        <CheckInOut
          assignmentId={todayAssignment.id}
          hasCheckin={!!todayAssignment.checkin_at}
          hasCheckout={!!todayAssignment.checkout_at}
          onCheckin={(data) => onCheckinUpdate({ assignmentId: todayAssignment!.id, checkinAt: data.checkin_at })}
          onCheckout={(data) => onCheckinUpdate({ assignmentId: todayAssignment!.id, checkoutAt: data.checkout_at })}
        />
      </div>
    </div>
  )
}