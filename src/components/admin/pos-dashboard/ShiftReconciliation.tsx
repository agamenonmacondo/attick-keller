'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { LockOpen, LockSimple } from '@phosphor-icons/react'

interface ShiftReconciliationProps {
  data: Array<{
    shiftId: string
    station: string
    cashier: string
    cashTotal: number
    cardTotal: number
    creditTotal: number
    openedAt: string
    closedAt: string | null
    isClosed: boolean
  }>
}

function formatShortDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const hour = d.getHours()
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hour}:${min}`
}

export function ShiftReconciliation({ data }: ShiftReconciliationProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Cierre de Turnos</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos de turnos</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Cierre de Turnos</SectionHeading>
      <p className="text-[10px] text-[var(--text-secondary)] mb-2">Ultimos 10 turnos registrados</p>
      <div className="overflow-x-auto mt-1">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Station</th>
              <th className="text-left py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Cajero</th>
              <th className="text-right py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Efectivo</th>
              <th className="text-right py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Tarjeta</th>
              <th className="text-right py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Credito</th>
              <th className="text-right py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Abierto</th>
              <th className="text-right py-1.5 pr-2 text-[var(--text-secondary)] font-medium">Cerrado</th>
              <th className="text-center py-1.5 text-[var(--text-secondary)] font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map(shift => (
              <tr key={shift.shiftId} className="border-b border-[var(--border-default)] last:border-0">
                <td className="py-1.5 pr-2 text-[var(--text-primary)] font-medium">{shift.station}</td>
                <td className="py-1.5 pr-2 text-[var(--text-primary)]">{shift.cashier}</td>
                <td className="py-1.5 pr-2 text-right text-[var(--text-primary)] tabular-nums">{formatCOPDisplay(shift.cashTotal)}</td>
                <td className="py-1.5 pr-2 text-right text-[var(--text-primary)] tabular-nums">{formatCOPDisplay(shift.cardTotal)}</td>
                <td className="py-1.5 pr-2 text-right text-[var(--text-primary)] tabular-nums">{formatCOPDisplay(shift.creditTotal)}</td>
                <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)] tabular-nums">{formatShortDateTime(shift.openedAt)}</td>
                <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)] tabular-nums">{formatShortDateTime(shift.closedAt)}</td>
                <td className="py-1.5 text-center">
                  {shift.isClosed ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-green-500">
                      <LockSimple size={9} /> Cerrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-red-400">
                      <LockOpen size={9} /> Abierto
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}