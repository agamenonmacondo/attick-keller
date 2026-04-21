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
}

export function HostOccupancySummary({ stats, occupancy }: OccupancySummaryProps) {
  const prefersReduced = usePrefersReducedMotion()

  const cards = [
    {
      label: 'Mesas',
      value: occupancy.occupiedTables,
      total: occupancy.totalTables,
      color: 'text-[#3E2723]',
    },
    {
      label: 'Invitados',
      value: occupancy.occupiedCapacity,
      total: occupancy.totalCapacity,
      color: 'text-[#3E2723]',
    },
    {
      label: 'Pendientes',
      value: stats.pending,
      color: 'text-[#D4922A]',
    },
    {
      label: 'Confirmadas',
      value: stats.confirmed,
      color: 'text-[#5C7A4D]',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
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
            className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4 text-center h-full"
          >
            <p className="text-xs md:text-sm text-[#8D6E63] font-medium uppercase tracking-wide">
              {card.label}
            </p>
            <p className={`text-xl md:text-2xl font-bold ${card.color} font-['Playfair_Display'] mt-1`}>
              <AnimatedCounter value={card.value} />
              {card.total !== undefined && (
                <span className="text-[#8D6E63] font-normal text-base ml-0.5">
                  /{card.total}
                </span>
              )}
            </p>
          </AnimatedCard>
        </motion.div>
      ))}
    </motion.div>
  )
}
