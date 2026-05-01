'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { EmptyState } from '../admin/shared/EmptyState'
import { SectionHeading } from '../admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { Table, Users, ArrowsMerge, X } from '@phosphor-icons/react'

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6, transform: 'translateY(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

interface TableItem {
  id: string
  number: string
  capacity: number
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
  can_combine: boolean
  combine_group: string | null
  reservation_status: string | null
}

interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
  tables: TableItem[]
}

interface HostTableMapProps {
  zones: Zone[]
  reservations: Array<Record<string, unknown>>
  onAction: () => void
}

/** Determine table status for coloring */
function getTableStatus(table: TableItem): 'available' | 'occupied' | 'reserved' {
  if (!table.is_occupied) return 'available'
  if (table.reservation_status === 'seated') return 'occupied'
  return 'reserved'
}

/** Status-based card styling */
function getTableStatusStyle(status: 'available' | 'occupied' | 'reserved') {
  switch (status) {
    case 'available':
      return {
        border: 'border-[#5C7A4D]/30',
        bg: 'bg-[#5C7A4D]/5',
        dot: 'bg-[#5C7A4D]',
        hoverBorder: 'hover:border-[#5C7A4D]/50',
      }
    case 'occupied':
      return {
        border: 'border-[#6B2737]/30',
        bg: 'bg-[#6B2737]/8',
        dot: 'bg-[#6B2737]',
        hoverBorder: 'hover:border-[#6B2737]/50',
      }
    case 'reserved':
      return {
        border: 'border-[#D4922A]/30',
        bg: 'bg-[#D4922A]/8',
        dot: 'bg-[#D4922A]',
        hoverBorder: 'hover:border-[#D4922A]/50',
      }
  }
}

export function HostTableMap({ zones, reservations, onAction }: HostTableMapProps) {
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prefersReduced = usePrefersReducedMotion()

  // Unassigned reservations (confirmed/pre_paid with no table)
  const unassignedReservations = reservations.filter(
    r => ['confirmed', 'pre_paid', 'pending'].includes(r.status as string) && !r.table_id
  ) as Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>

  const handleAssign = async (reservationId: string, tableId: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al asignar mesa')
        setTimeout(() => setError(null), 4000)
      } else {
        setActiveTableId(null)
        onAction()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleUnassign = async (reservationId: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al liberar mesa')
        setTimeout(() => setError(null), 4000)
      } else {
        setActiveTableId(null)
        onAction()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading>Mapa de Mesas</SectionHeading>

      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs text-[#8D6E63]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5C7A4D]" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6B2737]" />
          Ocupada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D4922A]" />
          Reservada
        </span>
      </div>

      {error && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </motion.div>
      )}

      {zones.map(zone => (
        <div key={zone.id}>
          <h3 className="text-sm font-medium text-[#5D4037] uppercase tracking-wider mb-2">
            {zone.name}
          </h3>
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3"
            variants={prefersReduced ? undefined : containerVariants}
            initial="hidden"
            animate="visible"
          >
            {zone.tables.map(table => (
              <HostTableCard
                key={table.id}
                table={table}
                isActive={activeTableId === table.id}
                unassignedReservations={unassignedReservations}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
                onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
                variants={prefersReduced ? undefined : itemVariants}
              />
            ))}
          </motion.div>
        </div>
      ))}

      {zones.length === 0 && (
        <EmptyState
          icon={<Table size={40} weight="duotone" className="text-[#D7CCC8]" />}
          title="No hay zonas configuradas"
          description="Contacta al administrador para configurar mesas y zonas."
          className="bg-white rounded-xl border border-[#D7CCC8]"
        />
      )}
    </div>
  )
}

function HostTableCard({
  table,
  isActive,
  unassignedReservations,
  onAssign,
  onUnassign,
  onClick,
  variants,
}: {
  table: TableItem
  isActive: boolean
  unassignedReservations: Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>
  onAssign: (reservationId: string, tableId: string) => Promise<void>
  onUnassign: (reservationId: string) => Promise<void>
  onClick: () => void
  variants?: Variants
}) {
  const prefersReduced = usePrefersReducedMotion()
  const status = getTableStatus(table)
  const statusStyle = getTableStatusStyle(status)

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        variants={variants}
        className={cn(
          'w-full rounded-xl border-2 p-2 md:p-3 text-left transition-colors',
          statusStyle.border,
          statusStyle.bg,
          statusStyle.hoverBorder,
          isActive && 'ring-2 ring-[#D4922A] ring-offset-1'
        )}
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out, border-color 200ms ease-out' }}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm md:text-base font-bold text-[#3E2723]">
            Mesa {table.number}
          </span>
          <span className={cn('w-2.5 h-2.5 rounded-full', statusStyle.dot)} />
        </div>

        {/* Capacity — prominent */}
        <div className="flex items-center gap-1 text-xs text-[#8D6E63]">
          <Users size={12} weight="bold" />
          <span className="font-semibold text-[#3E2723]">{table.capacity}</span>
          <span>{table.capacity === 1 ? 'persona' : 'personas'}</span>
        </div>

        {/* Combine badge */}
        {table.can_combine && table.combine_group && (
          <div className="flex items-center gap-0.5 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#C9A94E]/10 border border-[#C9A94E]/20 text-[10px] font-medium text-[#C9A94E]">
              <ArrowsMerge size={10} weight="bold" />
              {table.combine_group}
            </span>
          </div>
        )}

        {/* Occupied info */}
        {table.is_occupied && table.current_customer_name && (
          <p className="text-xs text-[#3E2723] font-medium truncate mt-1">
            {table.current_customer_name}
          </p>
        )}
        {table.is_occupied && table.current_time && (
          <p className="text-[10px] text-[#8D6E63] mt-0.5">
            {table.current_time}
          </p>
        )}
      </motion.button>

      {/* Popover */}
      {isActive && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, scale: 0.95, transform: 'scale(0.95)' }}
          animate={{ opacity: 1, scale: 1, transform: 'scale(1)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[#D7CCC8] shadow-lg p-3"
          style={{ minWidth: '180px' }}
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className="absolute top-2 right-2 text-[#8D6E63] hover:text-[#3E2723] transition-colors"
          >
            <X size={14} />
          </button>

          {table.is_occupied && table.current_reservation_id ? (
            <div>
              <p className="text-sm font-medium text-[#3E2723] mb-1">
                {table.current_customer_name || 'Ocupada'}
              </p>
              <p className="text-xs text-[#8D6E63] mb-1">
                {table.current_party_size} personas
                {table.current_time ? ` · ${table.current_time}` : ''}
              </p>
              {table.reservation_status && (
                <p className="text-[10px] uppercase tracking-wider text-[#8D6E63] mb-3">
                  {table.reservation_status === 'seated' ? 'Sentados' : table.reservation_status}
                </p>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(table.current_reservation_id!) }}
                className="w-full py-2 text-sm font-medium rounded-lg bg-[#6B2737] text-white hover:bg-[#5C2230] active:scale-[0.97] transition-all"
                style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              >
                Liberar mesa
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[#3E2723] mb-2">Asignar reserva</p>
              {unassignedReservations.length === 0 ? (
                <p className="text-xs text-[#8D6E63]">Sin reservas pendientes</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {unassignedReservations.map(r => (
                    <button
                      key={r.id}
                      onClick={(e) => { e.stopPropagation(); onAssign(r.id, table.id) }}
                      className="w-full text-left p-2 rounded-lg bg-[#F5EDE0] hover:bg-[#D7CCC8]/50 text-xs transition-colors active:scale-[0.97]"
                      style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                    >
                      <span className="font-medium text-[#3E2723]">{r.customers?.full_name || 'Sin nombre'}</span>
                      <span className="text-[#8D6E63] ml-2">{r.party_size}p · {r.time_start?.slice(0, 5)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}