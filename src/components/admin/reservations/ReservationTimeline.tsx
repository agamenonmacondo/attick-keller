'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { formatTime } from '@/lib/utils/formatDate'
import { SERVICE_HOURS } from '@/lib/utils/serviceHours'
import { StatusBadge, getStatusConfig } from '../shared/StatusBadge'
import { Check, X } from '@phosphor-icons/react'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

const HOURS = SERVICE_HOURS

interface ReservationItem {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  source: string
  special_requests: string | null
  customers: {
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  zone_name: string | null
  [key: string]: unknown
}

interface ReservationTimelineProps {
  reservations: ReservationItem[]
  loading: boolean
  detailId: string | null
  onSelect: (id: string | null) => void
}

export function ReservationTimeline({
  reservations,
  loading,
  detailId,
  onSelect,
}: ReservationTimelineProps) {
  const prefersReduced = usePrefersReducedMotion()

  // Group reservations by time slot
  const slots: Record<string, ReservationItem[]> = {}
  HOURS.forEach((h) => {
    slots[h] = []
  })
  for (const r of reservations) {
    if (slots[r.time_start]) {
      slots[r.time_start].push(r)
    } else {
      // Snap to closest hour slot
      const closest = HOURS.find((h) => h >= r.time_start) ?? HOURS[HOURS.length - 1]
      slots[closest].push(r)
    }
  }

  // Loading skeleton
  if (loading && reservations.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-[#EFEBE9]"
          />
        ))}
      </div>
    )
  }

  // Empty state
  if (reservations.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[#8D6E63]">Sin reservas para este dia</p>
        <p className="mt-1 text-xs text-[#BCAAA4]">Selecciona otra fecha</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#D7CCC8]/50">
      {HOURS.map((hour) => {
        const slotReservations = slots[hour] || []
        if (slotReservations.length === 0) return null

        return (
          <div key={hour} className="flex">
            {/* Hour label */}
            <div className="w-16 py-3 pr-3 text-right">
              <span className="font-mono text-xs text-[#8D6E63]">
                {formatTime(hour)}
              </span>
            </div>

            {/* Reservation rows */}
            <div className="min-h-[3.5rem] flex-1 border-l border-[#D7CCC8] py-2 pl-3">
              <AnimatePresence>
                {slotReservations.map((r, i) => {
                  const cfg = getStatusConfig(r.status)
                  return (
                    <motion.div
                      key={r.id}
                      initial={
                        prefersReduced
                          ? { opacity: 1 }
                          : { opacity: 0, transform: 'translateY(8px)' }
                      }
                      animate={{ opacity: 1, transform: 'translateY(0)' }}
                      exit={
                        prefersReduced
                          ? { opacity: 0 }
                          : { opacity: 0, transform: 'translateX(-20px)' }
                      }
                      transition={{
                        duration: 0.2,
                        delay: prefersReduced ? 0 : i * 0.03,
                        ease: EASE_OUT,
                      }}
                      onClick={() =>
                        onSelect(detailId === r.id ? null : r.id)
                      }
                      className={cn(
                        'mb-1 flex cursor-pointer items-center gap-3 rounded-md border border-[#D7CCC8] px-3 py-2 hover:bg-[#EFEBE9] active:scale-[0.99]',
                        detailId === r.id && 'bg-[#EFEBE9] ring-1 ring-[#6B2737]/20',
                        cfg.bg,
                      )}
                      style={{
                        transition:
                          'transform 160ms ease-out, background-color 200ms ease-out',
                      }}
                    >
                      <StatusBadge status={r.status} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#3E2723]">
                          {r.customers?.full_name || r.customers?.email || 'Cliente'}
                        </p>
                        <p className="text-xs text-[#8D6E63]">
                          {formatTime(r.time_start)} - {formatTime(r.time_end)}
                          {r.zone_name && ` \u00B7 ${r.zone_name}`}
                        </p>
                      </div>

                      <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-medium text-[#3E2723]">
                        {r.party_size}p
                      </span>

                      {/* Quick action buttons for pending */}
                      {r.status === 'pending' && (
                        <div className="ml-1 flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(r.id)
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97]"
                            style={{
                              transition:
                                'transform 160ms ease-out, background-color 200ms ease-out',
                            }}
                            title="Confirmar"
                          >
                            <Check size={12} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(r.id)
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 active:scale-[0.97]"
                            style={{
                              transition:
                                'transform 160ms ease-out, background-color 200ms ease-out',
                            }}
                            title="Cancelar"
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}