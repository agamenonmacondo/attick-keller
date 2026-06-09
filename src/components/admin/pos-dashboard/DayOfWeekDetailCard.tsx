'use client'

import { TrendUp, TrendDown, Minus, X } from '@phosphor-icons/react'
import type { AggregatedDay } from './POSDailyTrendChart'

interface DayOfWeekDetailCardProps {
  dayData: AggregatedDay
  onClose: () => void
}

function formatCOP(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${Math.round(abs).toLocaleString('es-CO')}`
}

function DiffBadge({ value, avg }: { value: number; avg: number }) {
  if (avg === 0) return null
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

function MetricRow({ label, total, avg, unit }: { label: string; total: number; avg: number; unit?: string }) {
  const fmt = unit === 'cop' ? formatCOP : (n: number) => Math.round(n).toLocaleString('es-CO')
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)] last:border-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(total)}</span>
          <span className="text-[9px] text-[var(--text-muted)] ml-1">total</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-[var(--text-muted)]">{fmt(avg)}</span>
          <span className="text-[9px] text-[var(--text-muted)] ml-0.5">prom/dia</span>
        </div>
        <DiffBadge value={avg} avg={0} />
      </div>
    </div>
  )
}

export function DayOfWeekDetailCard({ dayData, onClose }: DayOfWeekDetailCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{dayData.fullLabel}</h3>
          <p className="text-[10px] text-[var(--text-muted)]">
            {dayData.count} {dayData.count === 1 ? 'dia' : 'dias'} de datos · Promedio/dia vs total acumulado
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--border-default)] transition-colors text-[var(--text-secondary)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* KPI cards — 3 columnas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Ventas */}
        <div className="bg-[var(--color-ak-borgona)]/10 border border-[var(--color-ak-borgona)]/20 rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Ventas/dia</div>
          <div className="text-base font-bold text-[var(--color-ak-borgona)]">{formatCOP(dayData.avgRevenue)}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {formatCOP(dayData.totalRevenue)}</div>
        </div>
        {/* Cheques */}
        <div className="bg-[var(--color-ak-dorado)]/10 border border-[var(--color-ak-dorado)]/20 rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Cheques/dia</div>
          <div className="text-base font-bold text-[var(--color-ak-dorado)]">{Math.round(dayData.avgCheques)}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {Math.round(dayData.totalCheques)}</div>
        </div>
        {/* Propina */}
        <div className="bg-[var(--color-ak-oliva)]/10 border border-[var(--color-ak-oliva)]/20 rounded-lg p-3 text-center">
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Propina/dia</div>
          <div className="text-base font-bold text-[var(--color-ak-oliva)]">{formatCOP(dayData.avgPropina)}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {formatCOP(dayData.totalPropina)}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-0">
        <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-secondary)]">Ventas</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--text-primary)]">{formatCOP(dayData.avgRevenue)}<span className="text-[9px] text-[var(--text-muted)] ml-1 font-normal">prom/dia</span></span>
            <span className="text-xs text-[var(--text-muted)]">{formatCOP(dayData.totalRevenue)}<span className="text-[9px] ml-0.5">total</span></span>
          </div>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-secondary)]">Cheques</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--text-primary)]">{Math.round(dayData.avgCheques)}<span className="text-[9px] text-[var(--text-muted)] ml-1 font-normal">prom/dia</span></span>
            <span className="text-xs text-[var(--text-muted)]">{Math.round(dayData.totalCheques)}<span className="text-[9px] ml-0.5">total</span></span>
          </div>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-secondary)]">Propina</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--text-primary)]">{formatCOP(dayData.avgPropina)}<span className="text-[9px] text-[var(--text-muted)] ml-1 font-normal">prom/dia</span></span>
            <span className="text-xs text-[var(--text-muted)]">{formatCOP(dayData.totalPropina)}<span className="text-[9px] ml-0.5">total</span></span>
          </div>
        </div>
        {dayData.avgCheques > 0 && (
          <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)]">
            <span className="text-xs text-[var(--text-secondary)]">Ticket prom.</span>
            <span className="text-xs font-bold text-[var(--text-primary)]">{formatCOP(dayData.avgRevenue / dayData.avgCheques)}</span>
          </div>
        )}
        {dayData.avgRevenue > 0 && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Propina %</span>
            <span className="text-xs font-bold text-[var(--text-primary)]">{((dayData.avgPropina / dayData.avgRevenue) * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}