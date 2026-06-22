'use client'

import { useMemo } from 'react'
import { CalendarCheck, Sparkle } from '@phosphor-icons/react'

interface ReservasConversionTableProps {
  data: { data: any[]; summary: any } | null
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const fmtNum = (n: number) => Math.round(n).toLocaleString('es-CO')

export function ReservasConversionTable({ data }: ReservasConversionTableProps) {
  const { rows, summary } = useMemo(() => {
    const rows = (data?.data ?? []).map((r: any) => ({
      ...r,
      _revPerPerson: Number(r.total_pax ?? 0) > 0
        ? Number(r.revenue ?? 0) / Number(r.total_pax ?? 0)
        : 0,
      _isEventoGrande: Number(r.total_pax ?? 0) >= 15,
    }))
    return { rows, summary: data?.summary }
  }, [data])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
        Sin reservas registradas en este período.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ak-dorado)]">
          <CalendarCheck size={16} weight="fill" />
          Reservas vs Ventas vs Staff
        </h3>
        {summary && (
          <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
            <span>Reservas: <strong className="text-[var(--text-primary)]">{summary.total_reservas ?? 0}</strong></span>
            <span>Pax: <strong className="text-[var(--text-primary)]">{summary.total_pax ?? 0}</strong></span>
            <span className="flex items-center gap-1">
              <Sparkle size={12} className="text-[var(--color-ak-dorado)]" weight="fill" />
              Eventos grandes: <strong className="text-[var(--color-ak-dorado)]">{summary.eventos_grandes ?? 0}</strong>
            </span>
          </div>
        )}
      </div>

      <table className="w-full text-xs min-w-[680px]">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="py-2 pr-3 font-medium uppercase tracking-wide">Fecha</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Reservas</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Pax</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-center">Evento</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Revenue</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Staff</th>
            <th className="py-2 pl-2 font-medium uppercase tracking-wide text-right">$/Persona</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr
              key={`${r.fecha}-${i}`}
              className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-input)]/40"
              style={r._isEventoGrande ? { boxShadow: 'inset 3px 0 0 var(--color-ak-dorado)' } : undefined}
            >
              <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{r.fecha ?? '—'}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtNum(Number(r.num_reservas ?? 0))}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtNum(Number(r.total_pax ?? 0))}</td>
              <td className="py-2 px-2 text-center">
                {r._isEventoGrande ? (
                  <Sparkle size={14} weight="fill" className="text-[var(--color-ak-dorado)] inline" />
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </td>
              <td className="py-2 px-2 text-right text-[var(--color-ak-dorado)]">{fmtCOP.format(Number(r.revenue ?? 0))}</td>
              <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{fmtNum(Number(r.staff_asignado ?? 0))}</td>
              <td className="py-2 pl-2 text-right font-semibold text-[var(--text-primary)]">
                {r._revPerPerson > 0 ? fmtCOP.format(r._revPerPerson) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}