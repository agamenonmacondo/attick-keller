'use client'

import { AnimatedCard } from '@/components/admin/shared/AnimatedCard'
import { AnimatedCounter } from '@/components/admin/shared/AnimatedCounter'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { motion } from 'framer-motion'

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8, transform: 'translateY(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

interface OccupancySummaryProps {
  stats: {
    total: number
    pending: number
    confirmed: number
    seated: number
    completed: number
    totalGuests: number
    seatedGuests: number
  }
  occupancy: {
    totalTables: number
    occupiedTables: number
    totalCapacity: number
    occupiedCapacity: number
    utilizationPercent: number
    capacityPercent: number
  }
  quickStats?: {
    totalCapacity: number
    occupied: number
    available: number
    reserved: number
  }
  zoneSummaries?: Array<{
    id: string
    name: string
    totalSeats: number
    occupiedSeats: number
    reservedSeats: number
    availableSeats: number
    occupancyPercent: number
  }>
}

export function HostOccupancySummary({ stats, occupancy, quickStats, zoneSummaries }: OccupancySummaryProps) {
  const prefersReduced = usePrefersReducedMotion()

  const occupied = quickStats?.occupied ?? occupancy.occupiedCapacity
  const reserved = quickStats?.reserved ?? stats.confirmed
  const available = quickStats?.available ?? (occupancy.totalCapacity - occupancy.occupiedCapacity)
  const total = quickStats?.totalCapacity ?? occupancy.totalCapacity

  const cards = [
    {
      label: 'Capacidad Total',
      value: total,
      suffix: 'asientos',
      color: 'text-[var(--text-primary)]',
      bg: 'bg-[var(--bg-card)]',
      borderColor: 'border-[var(--border-default)]',
      // chip props
      dotColor: 'bg-[var(--text-secondary)]',
      chipLabel: 'Tot',
    },
    {
      label: 'Ocupados',
      value: occupied,
      suffix: 'asientos',
      color: 'text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]',
      bg: 'bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/10',
      borderColor: 'border-[var(--color-ak-borgona)]/20 dark:border-[var(--color-ak-borgona-light)]/20',
      dotColor: 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]',
      chipLabel: 'Ocup',
    },
    {
      label: 'Disponibles',
      value: available,
      suffix: 'asientos',
      color: 'text-[var(--color-ak-oliva)] dark:text-[var(--color-ak-oliva-light)]',
      bg: 'bg-[var(--color-ak-oliva)]/5 dark:bg-[var(--color-ak-oliva-light)]/10',
      borderColor: 'border-[var(--color-ak-oliva)]/20 dark:border-[var(--color-ak-oliva-light)]/20',
      dotColor: 'bg-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)]',
      chipLabel: 'Lib',
    },
    {
      label: 'Reservados',
      value: reserved,
      suffix: quickStats ? 'asientos' : undefined,
      color: 'text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)]',
      bg: 'bg-[var(--color-ak-ambar)]/5 dark:bg-[var(--color-ak-ambar-light)]/10',
      borderColor: 'border-[var(--color-ak-ambar)]/20 dark:border-[var(--color-ak-ambar-light)]/20',
      dotColor: 'bg-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)]',
      chipLabel: 'Res',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Mobile: compact chips */}
      <div className="flex lg:hidden items-center gap-3 text-sm font-medium">
        {cards.map(card => (
          <span key={card.label} className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${card.dotColor}`} />
            <span className={`font-bold ${card.color}`}><AnimatedCounter value={card.value} /></span>
            <span className="text-[var(--text-secondary)] text-xs">{card.chipLabel}</span>
          </span>
        ))}
      </div>

      {/* Desktop: full card layout */}
      <motion.div
        className="hidden lg:grid grid-cols-2 sm:grid-cols-4 gap-3"
        variants={prefersReduced ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            variants={prefersReduced ? undefined : itemVariants}
          >
            <AnimatedCard
              delay={index * 0.05}
              hover
              className={`${card.bg} rounded-xl border ${card.borderColor} p-3 md:p-4 text-center h-full`}
            >
              <p className="text-xs md:text-sm text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <p className={`text-xl md:text-2xl font-bold ${card.color} font-['Playfair_Display'] mt-1`}>
                <AnimatedCounter value={card.value} />
                {card.suffix && (
                  <span className="text-[var(--text-secondary)] font-normal text-xs md:text-sm ml-1">
                    {card.suffix}
                  </span>
                )}
              </p>
            </AnimatedCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Walk-in seats indicator — hidden on mobile (redundant with chips) */}
      {quickStats && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', ...SPRING, delay: 0.2 }}
          className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)]"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)] flex-shrink-0" />
          <span className="text-xs text-[var(--text-secondary)]">
            {quickStats.available} asientos disponibles para walk-in
            <span className="text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] ml-1">(referencia visual, sin límite estricto)</span>
          </span>
        </motion.div>
      )}

      {/* Zone capacity summary */}
      {zoneSummaries && zoneSummaries.length > 0 && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', ...SPRING, delay: 0.15 }}
          className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] font-['Playfair_Display'] mb-3">
            Resumen por Zona
          </h3>
          <div className="space-y-3">
            {zoneSummaries.map(zone => (
              <div key={zone.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{zone.name}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{zone.occupancyPercent}%</span>
                </div>
                {/* Occupancy bar */}
                <div className="h-2 rounded-full bg-[var(--bg-input)] overflow-hidden flex">
                  <div
                    className="h-full bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] rounded-l-full transition-all duration-500"
                    style={{ width: `${zone.totalSeats > 0 ? (zone.occupiedSeats / zone.totalSeats) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)] transition-all duration-500"
                    style={{ width: `${zone.totalSeats > 0 ? (zone.reservedSeats / zone.totalSeats) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]" />
                    Ocupados: {zone.occupiedSeats}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar-light)]" />
                    Reservados: {zone.reservedSeats}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-ak-oliva)] dark:bg-[var(--color-ak-oliva-light)]" />
                    Libres: {zone.availableSeats}
                  </span>
                  <span className="ml-auto font-medium text-[var(--text-primary)]">
                    {zone.totalSeats} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}