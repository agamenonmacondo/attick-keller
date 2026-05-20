'use client'

import { motion } from 'framer-motion'
import { Users, UserPlus, ClockCounterClockwise, Repeat, Star, Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'

interface SegmentTabsProps {
  counts: {
    all: number
    nuevos: number
    ocasional: number
    frecuente: number
    habitual: number
    vip: number
  } | null
  active: string | null
  onSelect: (segment: string | null) => void
}

const TABS: { key: string; label: string; icon: typeof Users; subtitle?: string }[] = [
  { key: 'all', label: 'Todos', icon: Users },
  { key: 'nuevos', label: 'Nuevos', icon: UserPlus, subtitle: '1v' },
  { key: 'ocasional', label: 'Ocasional', icon: ClockCounterClockwise, subtitle: '2-3v' },
  { key: 'frecuente', label: 'Frecuente', icon: Repeat, subtitle: '4-5v' },
  { key: 'habitual', label: 'Habitual', icon: Star, subtitle: '6-10v' },
  { key: 'vip', label: 'VIP', icon: Crown, subtitle: '11+v' },
]

export function SegmentTabs({ counts, active, onSelect }: SegmentTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = active === tab.key
        const count = counts ? counts[tab.key as keyof typeof counts] ?? 0 : 0
        const Icon = tab.icon

        return (
          <motion.button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key === 'all' ? null : tab.key)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
              isActive
                ? 'bg-[#6B2737] text-white border-[#6B2737]'
                : 'text-[#8D6E63] border-[#D7CCC8] bg-white hover:bg-[#EFEBE9]'
            )}
          >
            <Icon size={14} weight={isActive ? 'fill' : 'regular'} />
            <span>{tab.label}</span>
            {tab.subtitle && (
              <span className={cn(
                'text-[10px]',
                isActive ? 'text-white/70' : 'text-[#BCAAA4]'
              )}>
                {tab.subtitle}
              </span>
            )}
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F5EDE0] text-[#8D6E63]'
              )}
            >
              {count.toLocaleString()}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
