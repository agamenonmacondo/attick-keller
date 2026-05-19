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
      color: 'text-[#3E2723]',
      bg: 'bg-white',
      borderColor: 'border-[#D7CCC8]',
      // chip props
      dotColor: 'bg-[#8D6E63]',
      chipLabel: 'Tot',
    },
    {
      label: 'Ocupados',
      value: occupied,
      suffix: 'asientos',
      color: 'text-[#6B2737]',
      bg: 'bg-[#6B2737]/5',
      borderColor: 'border-[#6B2737]/20',
      dotColor: 'bg-[#6B2737]',
      chipLabel: 'Ocup',
    },
    {
      label: 'Disponibles',
      value: available,
      suffix: 'asientos',
      color: 'text-[#5C7A4D]',
      bg: 'bg-[#5C7A4D]/5',
      borderColor: 'border-[#5C7A4D]/20',
      dotColor: 'bg-[#5C7A4D]',
      chipLabel: 'Lib',
    },
    {
      label: 'Reservados',
      value: reserved,
      suffix: quickStats ? 'asientos' : undefined,
      color: 'text-[#D4922A]',
      bg: 'bg-[#D4922A]/5',
      borderColor: 'border-[#D4922A]/20',
      dotColor: 'bg-[#D4922A]',
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
            <span className="text-[#8D6E63] text-xs">{card.chipLabel}</span>
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
              <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <p className={`text-xl md:text-2xl font-bold ${card.color} font-['Playfair_Display'] mt-1`}>
                <AnimatedCounter value={card.value} />
                {card.suffix && (
                  <span className="text-[#8D6E63] font-normal text-xs md:text-sm ml-1">
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
          className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5EDE0] border border-[#D7CCC8]"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#5C7A4D] flex-shrink-0" />
          <span className="text-xs text-[#8D6E63]">
            {quickStats.available} asientos disponibles para walk-in
            <span className="text-[#D4922A] ml-1">(referencia visual, sin límite estricto)</span>
          </span>
        </motion.div>
      )}

      {/* Zone capacity summary */}
      {zoneSummaries && zoneSummaries.length > 0 && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', ...SPRING, delay: 0.15 }}
          className="bg-white rounded-xl border border-[#D7CCC8] p-4"
        >
          <h3 className="text-sm font-semibold text-[#3E2723] font-['Playfair_Display'] mb-3">
            Resumen por Zona
          </h3>
          <div className="space-y-3">
            {zoneSummaries.map(zone => (
              <div key={zone.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#3E2723]">{zone.name}</span>
                  <span className="text-xs font-bold text-[#3E2723]">{zone.occupancyPercent}%</span>
                </div>
                {/* Occupancy bar */}
                <div className="h-2 rounded-full bg-[#EFEBE9] overflow-hidden flex">
                  <div
                    className="h-full bg-[#6B2737] rounded-l-full transition-all duration-500"
                    style={{ width: `${zone.totalSeats > 0 ? (zone.occupiedSeats / zone.totalSeats) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-[#D4922A] transition-all duration-500"
                    style={{ width: `${zone.totalSeats > 0 ? (zone.reservedSeats / zone.totalSeats) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-[#8D6E63]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#6B2737]" />
                    Ocupados: {zone.occupiedSeats}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#D4922A]" />
                    Reservados: {zone.reservedSeats}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#5C7A4D]" />
                    Libres: {zone.availableSeats}
                  </span>
                  <span className="ml-auto font-medium text-[#3E2723]">
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