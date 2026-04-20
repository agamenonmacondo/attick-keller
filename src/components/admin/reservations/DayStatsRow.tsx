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
  amber: 'text-amber-700 bg-amber-50',
  emerald: 'text-emerald-700 bg-emerald-50',
  wine: 'text-[#6B2737] bg-[#6B2737]/5',
  blue: 'text-blue-700 bg-blue-50',
}

export function DayStatsRow({ stats }: DayStatsRowProps) {
  return (
    <div className="mb-6 grid grid-cols-5 gap-px overflow-hidden rounded-lg bg-[#D7CCC8]">
      {STAT_ITEMS.map((item, i) => {
        const value = stats[item.key as keyof typeof stats] ?? 0
        return (
          <AnimatedCard
            key={item.key}
            delay={i * 0.05}
            className={cn(ACCENT_MAP[item.accent] || 'bg-white')}
          >
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8D6E63]">
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