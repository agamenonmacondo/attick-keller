'use client'

import { useMemo } from 'react'
import { Warning, Fire, ChartLineUp, ArrowsLeftRight } from '@phosphor-icons/react'

interface GapsCoberturaAlertsProps {
  data: { data: any[]; summary: any } | null
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

type Alerta = 'GAP_COCINA' | 'SOBRA' | 'DESFASE' | string

function alertaConfig(tipo: Alerta) {
  switch (tipo) {
    case 'GAP_COCINA':
      return {
        bg: 'rgba(196,77,99,0.10)',
        border: 'rgba(196,77,99,0.45)',
        text: 'rgb(196,77,99)',
        Icon: Fire,
        label: 'Gap Cocina',
      }
    case 'SOBRA':
      return {
        bg: 'rgba(234,179,8,0.10)',
        border: 'rgba(234,179,8,0.45)',
        text: 'rgb(234,179,8)',
        Icon: ChartLineUp,
        label: 'Sobra',
      }
    case 'DESFASE':
      return {
        bg: 'rgba(249,115,22,0.10)',
        border: 'rgba(249,115,22,0.45)',
        text: 'rgb(249,115,22)',
        Icon: ArrowsLeftRight,
        label: 'Desfase',
      }
    default:
      return {
        bg: 'rgba(148,163,184,0.10)',
        border: 'rgba(148,163,184,0.4)',
        text: 'rgb(148,163,184)',
        Icon: Warning,
        label: tipo || 'Alerta',
      }
  }
}

export function GapsCoberturaAlerts({ data }: GapsCoberturaAlertsProps) {
  const rows = useMemo(() => data?.data ?? [], [data])
  const summary = data?.summary

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)] flex items-center gap-2">
        <Warning size={16} />
        Sin alertas de cobertura en este período.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ak-dorado)]">
          <Warning size={16} weight="fill" />
          Alertas de Cobertura
        </h3>
        {summary && (
          <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
            <span>Gaps cocina: <strong className="text-[var(--color-ak-borgona)]">{summary.total_gaps ?? 0}</strong></span>
            <span>Sobras: <strong className="text-[var(--color-ak-dorado)]">{summary.total_sobras ?? 0}</strong></span>
            <span>Áreas: <strong className="text-[var(--text-primary)]">{summary.areas_afectadas?.length ?? 0}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.slice(0, 30).map((r, i) => {
          const cfg = alertaConfig(r.tipo_alerta)
          const Icon = cfg.Icon
          return (
            <div
              key={`${r.hora}-${i}`}
              className="rounded-lg border p-3"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: cfg.text }}
                >
                  <Icon size={12} weight="fill" />
                  {cfg.label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {r.hora != null && `${r.hora}:00`}
                </span>
              </div>

              <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                Hora {r.hora != null ? `${r.hora}:00` : '—'}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">
                  {Number(r.personas ?? 0)} personas
                </span>
                <span className="font-medium text-[var(--color-ak-dorado)]">
                  {fmtCOP.format(Number(r.revenue ?? 0))}
                </span>
              </div>

              {r.revenue_por_persona != null && Number(r.revenue_por_persona) > 0 && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{fmtCOP.format(Number(r.revenue_por_persona))}/persona</div>
              )}
            </div>
          )
        })}
      </div>

      {rows.length > 30 && (
        <p className="text-[10px] text-[var(--text-muted)] mt-3 italic">
          Mostrando 30 de {rows.length} alertas.
        </p>
      )}
    </div>
  )
}