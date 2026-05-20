'use client'

import { motion } from 'framer-motion'
import { ArrowClockwise, ShieldCheck, Clock, Envelope } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'

interface QuickFilters {
  isRecurring: string | null
  tiers: string[]
  lastActivity: number | null
  hasEmail: string | null
}

interface QuickFilterChipsProps {
  filters: QuickFilters
  onChange: (filters: QuickFilters) => void
}

const TIER_OPTIONS = [
  { key: 'none', label: 'Sin actividad' },
  { key: 'new', label: 'Nuevo' },
  { key: 'occasional', label: 'Ocasional' },
  { key: 'regular', label: 'Regular' },
  { key: 'vip', label: 'VIP' },
] as const

const ACTIVITY_OPTIONS = [
  { key: 7, label: '7d' },
  { key: 30, label: '30d' },
  { key: 60, label: '60d' },
  { key: 90, label: '90d' },
] as const

export function QuickFilterChips({ filters, onChange }: QuickFilterChipsProps) {
  const toggleTier = (tier: string) => {
    const next = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier]
    onChange({ ...filters, tiers: next })
  }

  const toggleActivity = (days: number) => {
    onChange({
      ...filters,
      lastActivity: filters.lastActivity === days ? null : days,
    })
  }

  const cycleEmail = () => {
    const next = filters.hasEmail === null
      ? 'true'
      : filters.hasEmail === 'true'
        ? 'false'
        : null
    onChange({ ...filters, hasEmail: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recurrencia */}
      <motion.button
        type="button"
        onClick={() =>
          onChange({ ...filters, isRecurring: filters.isRecurring === 'true' ? null : 'true' })
        }
        whileTap={{ scale: 0.95 }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
          filters.isRecurring === 'true'
            ? 'bg-[#6B2737]/10 border-[#6B2737] text-[#3E2723] font-medium'
            : 'bg-white border-[#D7CCC8] text-[#8D6E63] hover:border-[#BCAAA4]'
        )}
      >
        <ArrowClockwise size={12} weight={filters.isRecurring === 'true' ? 'fill' : 'regular'} />
        Recurrente
      </motion.button>

      {/* Loyalty tiers */}
      <div className="flex items-center gap-1">
        <ShieldCheck size={12} className="text-[#8D6E63] shrink-0" />
        {TIER_OPTIONS.map((tier) => (
          <motion.button
            key={tier.key}
            type="button"
            onClick={() => toggleTier(tier.key)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              filters.tiers.includes(tier.key)
                ? 'bg-[#6B2737]/10 border-[#6B2737] text-[#3E2723] font-medium'
                : 'bg-white border-[#D7CCC8] text-[#8D6E63] hover:border-[#BCAAA4]'
            )}
          >
            {tier.label}
          </motion.button>
        ))}
      </div>

      {/* Last activity */}
      <div className="flex items-center gap-1">
        <Clock size={12} className="text-[#8D6E63] shrink-0" />
        {ACTIVITY_OPTIONS.map((opt) => (
          <motion.button
            key={opt.key}
            type="button"
            onClick={() => toggleActivity(opt.key)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              filters.lastActivity === opt.key
                ? 'bg-[#6B2737]/10 border-[#6B2737] text-[#3E2723] font-medium'
                : 'bg-white border-[#D7CCC8] text-[#8D6E63] hover:border-[#BCAAA4]'
            )}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>

      {/* Email filter */}
      <motion.button
        type="button"
        onClick={cycleEmail}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
          filters.hasEmail !== null
            ? 'bg-[#6B2737]/10 border-[#6B2737] text-[#3E2723] font-medium'
            : 'bg-white border-[#D7CCC8] text-[#8D6E63] hover:border-[#BCAAA4]'
        )}
      >
        <Envelope size={12} weight={filters.hasEmail !== null ? 'fill' : 'regular'} />
        {filters.hasEmail === null
          ? 'Email'
          : filters.hasEmail === 'true'
            ? 'Con email'
            : 'Sin email'}
      </motion.button>
    </div>
  )
}
