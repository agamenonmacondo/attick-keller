'use client'

import { AnimatedCard } from '../shared/AnimatedCard'
import { AnimatedCounter } from '../shared/AnimatedCounter'
import { cn } from '@/lib/utils/cn'

interface DayStatsRowProps {
  stats: {
    total: number
    pending: number
    confirmed: number
    seated: number
    completed: number
    cancelled: number
    no_show: number
    totalGuests: number
    seatedGuests: number
  }
}

const STAT_ITEMS = [
  { key: 'total', label: 'Total', accent: '' },
  { key: 'pending', label: 'Pendientes', accent: 'amber' },
  { key: 'confirmed', label: 'Confirmadas', accent: 'emerald' },
  { key: 'seated', label: 'Sentados', accent: 'wine' },
  { key: 'totalGuests', label: 'Invitados', accent: 'blue' },
] as const

const ACCENT_MAP: Record<string, string> = {
  amber: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
  emerald: 'text-[var(--color-success)] bg-[var(--color-success)]/10',
  wine: 'text-[var(--color-ak-borgona)] bg-[var(--color-ak-borgona)]/5',
  blue: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10',
}

export function DayStatsRow({ stats }: DayStatsRowProps) {
  return (
    <div className="mb-6 grid grid-cols-5 gap-px overflow-hidden rounded-lg bg-[var(--border-default)]">
      {STAT_ITEMS.map((item, i) => {
        const value = stats[item.key as keyof typeof stats] ?? 0
        return (
          <AnimatedCard
            key={item.key}
            delay={i * 0.05}
            className={cn(ACCENT_MAP[item.accent] || 'bg-[var(--bg-card)]')}
          >
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                {item.label}
              </p>
              <p className="font-mono text-xl font-bold">
                <AnimatedCounter value={value} />
              </p>
            </div>
          </AnimatedCard>
        )
      })}
    </div>
  )
}