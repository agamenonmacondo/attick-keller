'use client'

import { AnimatedCounter } from '../shared/AnimatedCounter'
import { type ReactNode } from 'react'

interface KPICardProps {
  label: string
  value: string | number
  icon?: ReactNode
  subtext?: string
  format?: 'currency' | 'number'
  className?: string
}

/** Format COP compact: $1.2M, $890K, $12.500 */
function formatCOPCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const str = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)
    return `${sign}$${str}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    const str = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)
    return `${sign}$${str}K`
  }
  return `${sign}$${abs.toLocaleString('es-CO')}`
}

export function formatCOPDisplay(n: number): string {
  return formatCOPCompact(n)
}

export function KPICard({ label, value, icon, subtext, className }: KPICardProps) {
  const displayValue = typeof value === 'number' ? formatCOPCompact(value) : value

  return (
    <div className={`bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4 flex flex-col gap-1.5 ${className || ''}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-[var(--text-secondary)]">{icon}</span>}
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : displayValue}
      </div>
      {subtext && (
        <span className="text-[10px] text-[var(--text-secondary)]">{subtext}</span>
      )}
    </div>
  )
}