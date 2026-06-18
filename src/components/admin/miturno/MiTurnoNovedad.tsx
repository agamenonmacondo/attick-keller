'use client'

import { WarningCircle } from '@phosphor-icons/react'
import ContingencyReport from '@/components/admin/shifts/ContingencyReport'

interface MiTurnoNovedadProps {
  employeeId?: string
  scheduleId?: string | null
  onSubmitted?: () => void
}

export function MiTurnoNovedad({ employeeId, scheduleId, onSubmitted }: MiTurnoNovedadProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-card)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <WarningCircle size={18} className="text-[var(--color-warning)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Reportar contingencia</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Si no puedes asistir, llegarás tarde, o necesitas un permiso, repórtalo aquí para que tu líder de área lo tenga en cuenta.
        </p>
        <ContingencyReport
          employeeId={employeeId ?? ''}
          scheduleId={scheduleId ?? null}
          onSubmitted={onSubmitted}
        />
      </div>
    </div>
  )
}