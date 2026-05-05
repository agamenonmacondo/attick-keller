'use client'

import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { EmptyState } from '../admin/shared/EmptyState'
import { SectionHeading } from '../admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { useTableSuggestion } from '@/lib/hooks/useTableSuggestion'
import { timeToMinutes } from '@/lib/utils/time'
import { formatTime12, formatTimeRange12 } from '@/lib/utils/format-time'
import { getUrgencyBadge } from '@/lib/utils/urgency'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'
import type { AssignmentResult } from '@/lib/algorithms/table-assignment'
import { ReservationDetail } from './ReservationDetail'
import {
  Table,
  Users,
  ArrowsMerge,
  X,
  Sparkle,
  Lightbulb,
  Clock,
  ArrowsLeftRight,
  Armchair,
} from '@phosphor-icons/react'

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

// ─── Shared interfaces ──────────────────────────────────────────────

interface TableItem {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  zone_id: string
  zone_name: string | null
  can_combine: boolean
  combine_group: string | null
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
  reservation_status: string | null
  reservations?: ReservationTimeline[]
  current_reservation?: ReservationTimeline | null
  next_reservation?: ReservationTimeline | null
  urgency_level?: 'urgent' | 'warning' | 'info' | 'none'
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
  currentTime?: string
  onReassign?: (
    reservation: ReservationTimeline,
    tableInfo: { id: string; name: string; zoneName: string }
  ) => void
}

// ─── Card styling helpers ───────────────────────────────────────────

type CardStyle = {
  border: string
  bg: string
  dot: string
  hoverBorder: string
  badge?: string
  pulse?: string
}

function getTableCardStyle(table: TableItem): CardStyle {
  // Occupied (seated) — burgundy
  if (table.reservations?.some((r: any) => r.is_current && r.status === 'seated') || table.reservations?.some((r: any) => r.is_upcoming && r.status === 'seated')) {
    return {
      border: 'border-[#6B2737]/30',
      bg: 'bg-[#6B2737]/8',
      dot: 'bg-[#6B2737]',
      hoverBorder: 'hover:border-[#6B2737]/50',
      badge: '',
      pulse: '',
    }
  }

  // Urgency-based styles
  const urgency = table.urgency_level || 'none'
  switch (urgency) {
    case 'urgent':
      return {
        border: 'border-[#C62828]',
        bg: 'bg-[#C62828]/8',
        dot: 'bg-[#C62828]',
        hoverBorder: 'hover:border-[#C62828]/50',
        badge: 'bg-[#C62828] text-white',
        pulse: 'animate-pulse',
      }
    case 'warning':
      return {
        border: 'border-[#E65100]',
        bg: 'bg-[#E65100]/8',
        dot: 'bg-[#E65100]',
        hoverBorder: 'hover:border-[#E65100]/50',
        badge: 'bg-[#E65100] text-white',
        pulse: '',
      }
    case 'info':
      return {
        border: 'border-[#1565C0]',
        bg: 'bg-[#1565C0]/8',
        dot: 'bg-[#1565C0]',
        hoverBorder: 'hover:border-[#1565C0]/50',
        badge: 'bg-[#1565C0] text-white',
        pulse: '',
      }
    default: {
      // Has upcoming reservation but >60min away → amber
      if (table.next_reservation) {
        return {
          border: 'border-[#D4922A]/30',
          bg: 'bg-[#D4922A]/8',
          dot: 'bg-[#D4922A]',
          hoverBorder: 'hover:border-[#D4922A]/50',
          badge: '',
          pulse: '',
        }
      }
      // Available — green
      return {
        border: 'border-[#5C7A4D]/30',
        bg: 'bg-[#5C7A4D]/5',
        dot: 'bg-[#5C7A4D]',
        hoverBorder: 'hover:border-[#5C7A4D]/50',
        badge: '',
        pulse: '',
      }
    }
  }
}

// ─── Mini timeline component ───────────────────────────────────────

function MiniTimeline({
  reservations,
  currentTime,
}: {
  reservations: ReservationTimeline[]
  currentTime: string
}) {
  const active = useMemo(
    () =>
      reservations
        .filter(r => !r.is_past)
        .sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start)),
    [reservations]
  )

  if (!active.length) return null

  const times = active.flatMap(r => [timeToMinutes(r.time_start), timeToMinutes(r.time_end)])
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const range = maxTime - minTime || 1
  const nowMins = timeToMinutes(currentTime)

  return (
    <div className="relative h-2 bg-[#EFEBE9] rounded-full overflow-hidden mt-1.5">
      {active.map(r => {
        const left = ((timeToMinutes(r.time_start) - minTime) / range) * 100
        const w = Math.max(((timeToMinutes(r.time_end) - timeToMinutes(r.time_start)) / range) * 100, 2)
        return (
          <div
            key={r.id}
            className={cn(
              'absolute top-0 h-full rounded-full transition-colors',
              r.is_current ? 'bg-[#6B2737]' : 'bg-[#D4922A]/40 border border-[#D4922A]/60'
            )}
            style={{ left: `${left}%`, width: `${w}%` }}
          />
        )
      })}
      {/* Now marker */}
      <div
        className="absolute top-0 h-full w-0.5 bg-black/50 z-10"
        style={{ left: `${Math.min(Math.max(((nowMins - minTime) / range) * 100, 0), 100)}%` }}
      />
    </div>
  )
}

// ─── Status badge helper ───────────────────────────────────────────

function StatusDot({ status }: { status: ReservationTimeline['status'] }) {
  const dotMap: Record<string, string> = {
    confirmed: 'bg-green-600',
    pre_paid: 'bg-green-600',
    seated: 'bg-green-600',
    pending: 'bg-[#D4922A]',
    no_show: 'bg-red-600',
    cancelled: 'bg-gray-400',
    completed: 'bg-gray-400',
  }
  const labelMap: Record<string, string> = {
    confirmed: 'Confirmado',
    pre_paid: 'Pre-pagado',
    seated: 'Sentados',
    pending: 'Pendiente',
    no_show: 'No asistió',
    cancelled: 'Cancelada',
    completed: 'Completado',
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#8D6E63] uppercase tracking-wider">
      <span className={cn('w-1.5 h-1.5 rounded-full', dotMap[status] || 'bg-gray-400')} />
      {labelMap[status] || status}
    </span>
  )
}

// ─── Main component ─────────────────────────────────────────────────

export function HostTableMap({ zones, reservations, onAction, currentTime, onReassign }: HostTableMapProps) {
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const prefersReduced = usePrefersReducedMotion()
  const suggestion = useTableSuggestion()

  const unassignedReservations = reservations.filter(
    r => ['confirmed', 'pre_paid', 'pending'].includes(r.status as string) && !r.table_id
  ) as Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>

  const handleAssign = async (reservationId: string, tableId: string, suggestedTableId?: string | null) => {
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
        if (suggestedTableId && suggestedTableId !== tableId) {
          logSuggestionCorrection(reservationId, suggestedTableId, tableId).catch(() => {})
        }
        setActiveTableId(null)
        setSelectedReservationId(null)
        suggestion.clear()
        onAction()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    }
  }

  const handleSuggestAssign = async (reservationId: string) => {
    if (!suggestion.result?.suggested_table_id) return
    await handleAssign(reservationId, suggestion.result.suggested_table_id, suggestion.result.suggested_table_id)
  }

  // Status change handler (used for seat/complete actions in timeline)
  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al actualizar estado')
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

  const handleSelectReservation = (reservationId: string) => {
    setSelectedReservationId(reservationId)
    suggestion.suggest(reservationId)
  }

  const logSuggestionCorrection = async (reservationId: string, suggestedTableId: string, actualTableId: string) => {
    try {
      await fetch('/api/admin/table-suggestion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          suggested_table_id: suggestedTableId,
          actual_table_id: actualTableId,
        }),
      })
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading>Mapa de Mesas</SectionHeading>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#8D6E63]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5C7A4D]" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6B2737]" />
          Ocupada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D4922A]" />
          Reservada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
          1h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E65100]" />
          30m
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C62828]" />
          15m
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
                selectedReservationId={selectedReservationId}
                onSelectReservation={handleSelectReservation}
                suggestion={suggestion}
                onSuggestAssign={handleSuggestAssign}
                currentTime={currentTime}
                onStatusChange={handleStatusChange}
                onReassign={onReassign}
                prefersReduced={prefersReduced}
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

// ─── Individual table card ─────────────────────────────────────────

function HostTableCard({
  table,
  isActive,
  unassignedReservations,
  onAssign,
  onUnassign,
  onClick,
  variants,
  selectedReservationId,
  onSelectReservation,
  suggestion,
  onSuggestAssign,
  currentTime,
  onStatusChange,
  onReassign,
  prefersReduced,
}: {
  table: TableItem
  isActive: boolean
  unassignedReservations: Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>
  onAssign: (reservationId: string, tableId: string, suggestedTableId?: string | null) => Promise<void>
  onUnassign: (reservationId: string) => Promise<void>
  onClick: () => void
  variants?: Variants
  selectedReservationId: string | null
  onSelectReservation: (reservationId: string) => void
  suggestion: { loading: boolean; result: AssignmentResult | null; error: string | null; suggest: (id: string) => void; clear: () => void }
  onSuggestAssign: (reservationId: string) => Promise<void>
  currentTime?: string
  onStatusChange?: (reservationId: string, newStatus: string) => Promise<void>
  onReassign?: (reservation: ReservationTimeline, tableInfo: { id: string; name: string; zoneName: string }) => void
  prefersReduced: boolean
}) {
  const style = getTableCardStyle(table)
  const urgencyBadge = getUrgencyBadge(table.urgency_level || 'none')
  const reservationsList = table.reservations || []
  const nextRes = table.next_reservation

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        variants={variants}
        className={cn(
          'w-full rounded-xl border-2 p-2 md:p-3 text-left transition-colors',
          style.border,
          style.bg,
          style.hoverBorder,
          style.pulse,
          isActive && 'ring-2 ring-[#D4922A] ring-offset-1'
        )}
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out, border-color 200ms ease-out' }}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      >
        {/* Top row: name + urgency badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm md:text-base font-bold text-[#3E2723] truncate">
              {table.name_attick || `Mesa ${table.number}`}
            </span>
            {table.name_attick && (
              <span className="text-[10px] text-[#8D6E63] shrink-0">({table.number})</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {urgencyBadge && style.badge && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', style.badge)}>
                {urgencyBadge}
              </span>
            )}
            <span className={cn('w-2.5 h-2.5 rounded-full', style.dot)} />
          </div>
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-1 text-xs text-[#8D6E63]">
          <Users size={12} weight="bold" />
          <span className="font-semibold text-[#3E2723]">{table.capacity}p</span>
        </div>

        {/* Mini-timeline bar */}
        {reservationsList.length > 0 && currentTime && (
          <MiniTimeline reservations={reservationsList} currentTime={currentTime} />
        )}

        {/* Current/upcoming customer info */}
        {(table.is_occupied || table.reservations?.some(r => r.is_upcoming)) && table.current_customer_name && (
          <p className="text-xs text-[#3E2723] font-medium truncate mt-1">
            {table.current_customer_name}
          </p>
        )}
        {(table.is_occupied || table.reservations?.some(r => r.is_upcoming)) && table.current_time && (
          <p className="text-[10px] text-[#8D6E63] mt-0.5">
            {formatTime12(table.current_time)}
          </p>
        )}

        {/* Next reservation preview — show when no current/upcoming customer name displayed and there's an upcoming reservation */}
        {!table.current_customer_name && nextRes && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8D6E63]">
            <Clock size={10} weight="bold" />
            <span className="truncate">
              {formatTime12(nextRes.time_start)} – {nextRes.customer_name || 'Sin nombre'} ({nextRes.party_size}p)
            </span>
          </div>
        )}
      </motion.button>

      {/* ── Backdrop ── */}
      {isActive && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onClick(); suggestion.clear() }}
        />
      )}

      {/* ── Popover / Bottom Sheet ── */}
      {isActive && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, translateY: 40, transform: 'translateY(40px)' }}
          animate={{ opacity: 1, translateY: 0, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, translateY: 40, transform: 'translateY(40px)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl overflow-y-auto',
            'max-h-[80vh]',
            (reservationsList.length > 0) ? 'p-5' : 'p-4'
          )}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-[#D7CCC8]" />
          </div>

          {/* Dismiss */}
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); suggestion.clear() }}
            className="absolute top-3 right-4 text-[#8D6E63] hover:text-[#3E2723] transition-colors z-10 p-1"
          >
            <X size={16} />
          </button>

          {reservationsList.length > 0 ? (
            /* ═══ TIMELINE VIEW ═══ */
            <TimelinePopover
              table={table}
              reservations={reservationsList}
              currentTime={currentTime}
              onStatusChange={onStatusChange}
              onUnassign={onUnassign}
              onReassign={onReassign}
            />
          ) : (table.is_occupied || table.reservations?.some(r => r.is_upcoming)) && table.current_reservation_id ? (
            /* ═══ OCCUPIED (backward compat — old API data without reservations[]) ═══ */
            <div>
              <p className="text-sm font-medium text-[#3E2723] mb-1">
                {table.current_customer_name || 'Ocupada'}
              </p>
              <p className="text-xs text-[#8D6E63] mb-1">
                {table.current_party_size}p
                {table.current_time ? ` · ${formatTime12(table.current_time)}` : ''}
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
            /* ═══ ASSIGNMENT VIEW ═══ */
            <AssignmentPopover
              unassignedReservations={unassignedReservations}
              selectedReservationId={selectedReservationId}
              onSelectReservation={onSelectReservation}
              suggestion={suggestion}
              tableId={table.id}
              onAssign={onAssign}
              onSuggestAssign={onSuggestAssign}
              suggestionClear={suggestion.clear}
            />
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─── Timeline popover content ──────────────────────────────────────

function TimelinePopover({
  table,
  reservations,
  currentTime,
  onStatusChange,
  onUnassign,
  onReassign,
}: {
  table: TableItem
  reservations: ReservationTimeline[]
  currentTime?: string
  onStatusChange?: (reservationId: string, newStatus: string) => Promise<void>
  onUnassign?: (reservationId: string) => Promise<void>
  onReassign?: (reservation: ReservationTimeline, tableInfo: { id: string; name: string; zoneName: string }) => void
}) {
  const sorted = useMemo(
    () => [...reservations].filter(r => !r.is_past).sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start)),
    [reservations]
  )
  const currentRes = sorted.find(r => r.is_current)
  const upcomingRes = sorted.filter(r => r.is_upcoming)
  const nextRes = upcomingRes[0]
  const laterRes = upcomingRes.slice(1)

  const tableInfo = { id: table.id, name: table.name_attick || `Mesa ${table.number}`, zoneName: table.zone_name || '' }

  return (
    <div className="space-y-3">
      {/* Popover header */}
      <div className="flex items-center justify-between mb-3 pr-6">
        <div className="flex items-center gap-2">
          <Armchair size={16} className="text-[#6B2737]" />
          <span className="font-bold text-base text-[#3E2723] font-['Playfair_Display']">
            {table.name_attick || `Mesa ${table.number}`}
          </span>
          {table.zone_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#6B2737]/10 text-[#6B2737] font-medium">
              {table.zone_name}
            </span>
          )}
        </div>
        <span className="text-sm text-[#8D6E63] font-medium">{table.capacity}p</span>
      </div>

      {/* Current reservation */}
      {currentRes && (
        <div>
          <h4 className="text-[10px] font-semibold text-[#6B2737] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B2737]" />
            AHORA
          </h4>
          <div className="bg-[#6B2737]/5 rounded-lg border border-[#6B2737]/20 p-3 space-y-2">
            <ReservationDetail reservation={currentRes} />
            <div className="flex gap-1.5 pt-1">
              {currentRes.status === 'seated' && onStatusChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange(currentRes.id, 'completed') }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[#6B2737] text-white hover:bg-[#5C2230] active:scale-[0.97] transition-all"
                >
                  Liberar mesa
                </button>
              )}
              {currentRes.status === 'confirmed' && onStatusChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange(currentRes.id, 'seated') }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[#5C7A4D] text-white hover:bg-[#4A6640] active:scale-[0.97] transition-all"
                >
                  Sentar
                </button>
              )}
              {onReassign && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReassign(currentRes, tableInfo) }}
                  className="py-2.5 px-3 text-xs font-medium rounded-xl border border-[#D7CCC8] text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97] transition-all"
                >
                  <ArrowsLeftRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next reservation */}
      {nextRes && !nextRes.is_current && (
        <div>
          <h4 className="text-[11px] font-semibold text-[#D4922A] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock size={11} weight="fill" className="text-[#D4922A]" />
            PRÓXIMA
            {currentTime && (() => {
              const diff = timeToMinutes(nextRes.time_start) - timeToMinutes(currentTime)
              if (diff > 0 && diff <= 60) return (
                <span className="text-[10px] font-bold text-[#E65100] bg-[#E65100]/10 px-1.5 py-0.5 rounded-full">
                  {diff} min
                </span>
              )
              return null
            })()}
          </h4>
          <div className="bg-[#D4922A]/5 rounded-lg border border-[#D4922A]/20 p-3 space-y-2">
            <ReservationDetail reservation={nextRes} />
            <div className="flex gap-1.5 pt-1">
              {nextRes.status === 'confirmed' && onStatusChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStatusChange(nextRes.id, 'seated') }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[#5C7A4D] text-white hover:bg-[#4A6640] active:scale-[0.97] transition-all"
                >
                  Sentar
                </button>
              )}
              {onReassign && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReassign(nextRes, tableInfo) }}
                  className="py-2.5 px-3 text-xs font-medium rounded-xl border border-[#D7CCC8] text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97] transition-all"
                >
                  <ArrowsLeftRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Later reservations */}
      {laterRes.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-[#8D6E63] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock size={10} />
            MÁS TARDE
          </h4>
          <div className="space-y-2">
            {laterRes.map(r => (
              <div key={r.id} className="bg-[#F5EDE0] rounded-lg border border-[#D7CCC8]/50 p-2.5 space-y-1">
                <ReservationDetail reservation={r} />
                {onReassign && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReassign(r, tableInfo) }}
                    className="w-full py-1 text-xs font-medium rounded-lg border border-[#D7CCC8] text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97] transition-all mt-1"
                  >
                    <span className="flex items-center justify-center gap-1">
                      <ArrowsLeftRight size={10} />
                      Reasignar
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No reservations message */}
      {sorted.length === 0 && (
        <p className="text-xs text-[#8D6E63] py-2 text-center">
          {reservations.some(r => r.is_past) ? 'Todas las reservas de esta mesa han finalizado' : 'Sin reservas'}
        </p>
      )}
    </div>
  )
}

// ─── Assignment popover content ────────────────────────────────────

function AssignmentPopover({
  unassignedReservations,
  selectedReservationId,
  onSelectReservation,
  suggestion,
  tableId,
  onAssign,
  onSuggestAssign,
  suggestionClear,
}: {
  unassignedReservations: Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>
  selectedReservationId: string | null
  onSelectReservation: (reservationId: string) => void
  suggestion: { loading: boolean; result: AssignmentResult | null; error: string | null }
  tableId: string
  onAssign: (reservationId: string, tableId: string, suggestedTableId?: string | null) => Promise<void>
  onSuggestAssign: (reservationId: string) => Promise<void>
  suggestionClear: () => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[#3E2723] mb-2">
        Asignar reserva
        {tableId ? ` (Mesa)` : ''}
      </p>
      {unassignedReservations.length === 0 ? (
        <p className="text-xs text-[#8D6E63]">Sin reservas pendientes</p>
      ) : selectedReservationId ? (
        <div className="space-y-3">
          {suggestion.loading && (
            <div className="flex items-center gap-2 text-xs text-[#8D6E63] py-2">
              <Sparkle size={14} className="animate-pulse text-[#D4922A]" />
              Calculando mejor mesa...
            </div>
          )}
          {suggestion.error && (
            <p className="text-xs text-red-600">{suggestion.error}</p>
          )}
          {suggestion.result && !suggestion.loading && (
            <>
              {suggestion.result.suggested_table_id && (
                <div className="rounded-lg border-2 border-[#D4922A]/40 bg-[#D4922A]/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb size={14} weight="fill" className="text-[#D4922A]" />
                    <span className="text-xs font-semibold text-[#D4922A] uppercase tracking-wider">Sugerencia</span>
                  </div>
                  <p className="text-sm font-bold text-[#3E2723] mb-1">
                    {suggestion.result.alternatives[0]?.table_numbers.join(' + ')}
                    <span className="font-normal text-[#8D6E63] ml-1.5">
                      {suggestion.result.alternatives[0]?.zone_name}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#8D6E63] mb-2">{suggestion.result.reason}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#D7CCC8] overflow-hidden">
                      <div className="h-full rounded-full bg-[#D4922A]" style={{ width: `${Math.min(suggestion.result.score, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-[#8D6E63]">{Math.round(suggestion.result.score)}%</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (tableId === suggestion.result!.suggested_table_id) {
                        onSuggestAssign(selectedReservationId)
                      } else {
                        onAssign(selectedReservationId, tableId, suggestion.result!.suggested_table_id)
                      }
                    }}
                    disabled={suggestion.loading}
                    className={cn(
                      'w-full py-2 text-sm font-semibold rounded-lg text-white active:scale-[0.97] disabled:opacity-50',
                      tableId === suggestion.result!.suggested_table_id
                        ? 'bg-[#6B2737] hover:bg-[#5C2230]'
                        : 'bg-[#D4922A] hover:bg-[#D4922A]/90'
                    )}
                  >
                    {tableId === suggestion.result!.suggested_table_id
                      ? 'Aceptar sugerencia'
                      : 'Asignar aquí (cambio)'}
                  </button>
                </div>
              )}
              {!suggestion.result.suggested_table_id && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700">{suggestion.result.reason}</p>
                </div>
              )}
              {suggestion.result.alternatives.length > 1 && (
                <div>
                  <p className="text-[10px] font-medium text-[#8D6E63] uppercase tracking-wider mb-1.5">Alternativas</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {suggestion.result.alternatives.slice(1, 4).map((alt, i) => (
                      <button
                        key={alt.table_id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAssign(selectedReservationId, alt.table_id, suggestion.result!.suggested_table_id)
                        }}
                        className="w-full flex items-center gap-2 text-left p-2 rounded-lg bg-[#F5EDE0] hover:bg-[#D7CCC8]/50 text-xs transition-colors active:scale-[0.97]"
                      >
                        <span className="font-medium text-[#3E2723]">{alt.table_numbers.join(' + ')}</span>
                        <span className="text-[#8D6E63]">{alt.zone_name} · {Math.round(alt.score)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); suggestionClear() }}
                className="w-full text-xs text-[#8D6E63] hover:text-[#3E2723] py-1 transition-colors"
              >
                ← Ver todas las reservas
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {unassignedReservations.map(r => (
            <button
              key={r.id}
              onClick={(e) => { e.stopPropagation(); onSelectReservation(r.id) }}
              className="w-full text-left p-2 rounded-lg bg-[#F5EDE0] hover:bg-[#D7CCC8]/50 text-xs transition-colors active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <Sparkle size={12} className="text-[#D4922A] shrink-0" />
                <span className="font-medium text-[#3E2723] truncate">{r.customers?.full_name || 'Sin nombre'}</span>
                <span className="text-[#8D6E63] ml-auto shrink-0">{r.party_size}p · {r.time_start?.slice(0, 5)}</span>
              </div>
              <p className="text-[10px] text-[#8D6E63] mt-0.5 ml-5">Toca para ver sugerencia</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
