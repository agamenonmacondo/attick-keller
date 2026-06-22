'use client'

import { useMemo } from 'react'
import { HandCoins, TrendDown, TrendUp, CheckCircle } from '@phosphor-icons/react'

interface NominaRatioCardProps {
  data: { data: any[]; summary: any } | null
}

type Estado = 'EFICIENTE' | 'ATENCION' | 'CRITICO'

function estadoFromRatio(ratio: number): Estado {
  if (ratio < 15) return 'EFICIENTE'
  if (ratio <= 20) return 'ATENCION'
  return 'CRITICO'
}

function estadoConfig(estado: Estado) {
  switch (estado) {
    case 'EFICIENTE':
      return {
        bg: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.4)',
        text: 'rgb(34,197,94)',
        Icon: CheckCircle,
        label: 'Eficiente',
      }
    case 'ATENCION':
      return {
        bg: 'rgba(234,179,8,0.12)',
        border: 'rgba(234,179,8,0.4)',
        text: 'rgb(234,179,8)',
        Icon: TrendUp,
        label: 'Atención',
      }
    case 'CRITICO':
      return {
        bg: 'rgba(196,77,99,0.14)',
        border: 'rgba(196,77,99,0.5)',
        text: 'rgb(196,77,99)',
        Icon: TrendDown,
        label: 'Crítico',
      }
  }
}

export function NominaRatioCard({ data }: NominaRatioCardProps) {
  const { latest, rows } = useMemo(() => {
    const rows = data?.data ?? []
    const latest = rows.find((r: any) => Number(r.total_ventas ?? 0) > 0) ?? rows[0] ?? null
    return { latest, rows }
  }, [data])

  if (!latest) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
        Sin datos de nómina para este período.
      </div>
    )
  }

  const nomina = Number(latest.nomina_total ?? 0)
  const ventas = Number(latest.total_ventas ?? 0)
  const ratio = Number(latest.ratio_pct ?? (ventas > 0 ? (nomina / ventas) * 100 : 0))
  const estado = (latest.estado as Estado) || estadoFromRatio(ratio)
  const cfg = estadoConfig(estado)
  const Icon = cfg.Icon

  const fmtCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

  return (
    <div
      className="rounded-xl border p-4 bg-[var(--bg-card)]"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HandCoins size={18} weight="fill" className="text-[var(--color-ak-dorado)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Ratio Nómina / Ventas
          </h3>
          <span className="text-[10px] text-[var(--text-muted)]" title="EFICIENTE <15% · ATENCION 15-20% · CRITICO >20% · Mide qué % de las ventas se va en nómina del día">
            ¿Qué es esto?
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
        >
          <Icon size={12} weight="fill" />
          {cfg.label}
        </span>
      </div>

      <div className="text-3xl font-bold mb-3" style={{ color: cfg.text }}>
        {ratio.toFixed(1)}%
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Nómina
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {fmtCOP.format(nomina)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
            Ventas
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {fmtCOP.format(ventas)}
          </div>
        </div>
      </div>

      {latest.fecha && (
        <div className="text-[10px] text-[var(--text-muted)] mt-3">
          {latest.fecha}
        </div>
      )}
    </div>
  )
}