'use client'

import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface KPIs {
  revenue: number
  cheques: number
  ticketPromedio: number
  propinaTotal: number
  propinaPromedio: number
  personas: number
  partySizePromedio: number
  cardPaidTotal: number
  cashPaidTotal: number
}

interface DayKPIBarProps {
  kpis: KPIs
  averages?: KPIs
  isSingleDay?: boolean
}

function formatCompact(n: number, type: string): string {
  if (type === 'cheques' || type === 'personas') return Math.round(n).toLocaleString('es-CO')
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function DiffIndicator({ value, avg }: { value: number; avg?: number }) {
  if (avg === undefined || avg === 0) return null
  const pct = ((value - avg) / avg) * 100
  if (Math.abs(pct) < 1) return (
    <span className="flex items-center gap-0.5 text-[9px] text-[var(--text-secondary)]">
      <Minus size={9} />
    </span>
  )
  const isUp = pct > 0
  return (
    <span className={`flex items-center gap-0.5 text-[9px] font-medium ${isUp ? 'text-green-500' : 'text-red-400'}`}>
      {isUp ? <TrendUp size={9} /> : <TrendDown size={9} />}
      {isUp ? '+' : ''}{pct.toFixed(0)}%
    </span>
  )
}

export function DayKPIBar({ kpis, averages, isSingleDay }: DayKPIBarProps) {
  const items = [
    { key: 'revenue', label: 'Revenue', value: kpis.revenue },
    { key: 'cheques', label: 'Cheques', value: kpis.cheques },
    { key: 'ticketPromedio', label: 'Ticket prom.', value: kpis.ticketPromedio },
    { key: 'propinaTotal', label: 'Propinas', value: kpis.propinaTotal },
    { key: 'personas', label: 'Personas', value: kpis.personas },
    { key: 'cardPaidTotal', label: 'Tarjeta', value: kpis.cardPaidTotal },
    { key: 'cashPaidTotal', label: 'Efectivo', value: kpis.cashPaidTotal },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {items.map(item => (
        <div
          key={item.key}
          className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-center"
        >
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">
            {item.label}
          </div>
          <div className="text-sm font-bold text-[var(--text-primary)]">
            {formatCompact(item.value, item.key)}
          </div>
          {isSingleDay && averages && (
            <div className="mt-0.5">
              <DiffIndicator value={item.value} avg={averages[item.key as keyof KPIs]} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}