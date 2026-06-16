'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { StatusBadge } from '../admin/shared/StatusBadge'
import { EmptyState } from '../admin/shared/EmptyState'
import { ConfirmDialog } from '../admin/shared/ConfirmDialog'
import { SectionHeading } from '../admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { Check, X, Armchair, CalendarX, Warning, Clock, WhatsappLogo, EnvelopeSimple, Note, CaretDown, CaretUp, CalendarPlus, WarningCircle } from '@phosphor-icons/react'
import { formatTime12 } from '@/lib/utils/format-time'
import { getColombiaTime } from '@/lib/utils/date'
import { timeToMinutes } from '@/lib/utils/time'
import { ServiceFilter } from '../admin/reservations/ServiceFilter'
import { getServiceType, SERVICE_FILTERS, type ServiceType } from '@/lib/utils/serviceHours'
import { AuditTimeline } from '@/components/shared/reservations/AuditTimeline'
import { NotesPanel } from '@/components/shared/reservations/NotesPanel'
import { SeatedTimer } from '@/components/shared/reservations/SeatedTimer'
import { AssignTablePopup } from './AssignTablePopup'

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

const HOST_ACTION_MAP: Record<string, Array<{ status: string; label: string; variant: 'primary' | 'danger' | 'warning' }>> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
    { status: 'cancelled', label: 'Cancelar', variant: 'danger' },
  ],
  pre_paid: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
  ],
  confirmed: [
    { status: 'seated', label: 'Sentar', variant: 'primary' },
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
  ],
  seated: [
    { status: 'completed', label: 'Completar', variant: 'primary' },
  ],
}

const DESTRUCTIVE_STATUSES = ['cancelled', 'no_show']

/** Format an ISO timestamp into Colombia-localized short date+time */
function formatCreatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso + (iso.endsWith('Z') || iso.includes('+') ? '' : 'Z'))
    return d.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return null
  }
}

interface HostReservationQueueProps {
  reservations: Array<Record<string, unknown>>
  onAction: () => void
}

export function HostReservationQueue({ reservations, onAction }: HostReservationQueueProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [notesMap, setNotesMap] = useState<Record<string, string>>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    reservationId: string
    status: string
    label: string
  }>({ open: false, reservationId: '', status: '', label: '' })
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [assignTarget, setAssignTarget] = useState<{
    id: string
    partySize: number
    customerName: string
    timeStart: string
    timeEnd: string
  } | null>(null)
  const prefersReduced = usePrefersReducedMotion()

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStatusChange = async (id: string, status: string) => {
    setConfirming(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al actualizar estado')
        setTimeout(() => setError(null), 4000)
      } else {
        onAction()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    } finally {
      setConfirming(null)
    }
  }

  const requestStatusChange = (id: string, status: string, label: string) => {
    if (DESTRUCTIVE_STATUSES.includes(status)) {
      setConfirmDialog({ open: true, reservationId: id, status, label })
    } else {
      handleStatusChange(id, status)
    }
  }

  // Filter: host sees pending, pre_paid, confirmed, and seated reservations
  const hostReservations = reservations.filter(r => {
    const status = r.status as string
    return ['pending', 'pre_paid', 'confirmed', 'seated'].includes(status)
  })

  // Service filter
  const serviceFiltered = serviceFilter === 'all'
    ? hostReservations
    : hostReservations.filter(r => getServiceType(String(r.time_start || '')) === serviceFilter)

  const serviceCounts = {
    all: hostReservations.length,
    breakfast: hostReservations.filter(r => getServiceType(String(r.time_start || '')) === 'breakfast').length,
    lunch: hostReservations.filter(r => getServiceType(String(r.time_start || '')) === 'lunch').length,
    dinner: hostReservations.filter(r => getServiceType(String(r.time_start || '')) === 'dinner').length,
  }

  // Sort by time_start
  const sorted = [...serviceFiltered].sort((a, b) =>
    String(a.time_start || '').localeCompare(String(b.time_start || ''))
  )

  // Group by time_start (formatted as 12h key)
  const groupedByTime = sorted.reduce<Record<string, Array<Record<string, unknown>>>>((acc, r) => {
    const key = formatTime12((r.time_start as string) || '') || 'Sin hora'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const colombiaNow = getColombiaTime()
  const colombiaNowMinutes = timeToMinutes(colombiaNow)
  const fifteenMin = 15 // minutes, not milliseconds

  return (
    <div className="space-y-3"
    >
      <SectionHeading>Reservas de Hoy</SectionHeading>

      <ServiceFilter active={serviceFilter} onChange={setServiceFilter} counts={serviceCounts} />

      {/* Alert: unassigned reservations */}
      {(() => {
        const unassigned = hostReservations.filter(r => {
          const status = r.status as string
          return ['confirmed', 'pending', 'pre_paid'].includes(status) && !r.table_id
        })
        if (unassigned.length === 0) return null
        const totalUnassignedPax = unassigned.reduce((s, r) => s + (r.party_size as number), 0)
        const hasBigEvent = unassigned.some(r => (r.party_size as number) >= 20)
        return (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl border p-3 cursor-pointer transition-all hover:ring-2',
              hasBigEvent
                ? 'border-[var(--color-ak-ambar)]/50 dark:border-[var(--color-ak-ambar-light)]/50 bg-[var(--color-ak-ambar)]/5 dark:bg-[var(--color-ak-ambar-light)]/10 hover:ring-[var(--color-ak-ambar)]/30 dark:hover:ring-[var(--color-ak-ambar-light)]/30'
                : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:ring-[var(--text-secondary)]/20'
            )}
            onClick={() => {
              // Open popup for the largest unassigned reservation
              const largest = unassigned.reduce((a, b) =>
                (a.party_size as number) > (b.party_size as number) ? a : b
              )
              const custData = largest.customers as { full_name: string } | null
              setAssignTarget({
                id: largest.id as string,
                partySize: largest.party_size as number,
                customerName: custData?.full_name || 'Sin nombre',
                timeStart: (largest.time_start as string) || '',
                timeEnd: (largest.time_end as string) || '',
              })
            }}
          >
            <div className="flex items-start gap-2">
              <WarningCircle size={18} weight="fill" className={cn(
                'shrink-0 mt-0.5',
                hasBigEvent ? 'text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)]' : 'text-[var(--text-secondary)]'
              )} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {unassigned.length} reserva{unassigned.length > 1 ? 's' : ''} sin mesa asignada
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {totalUnassignedPax} PAX · {hasBigEvent ? 'Incluye evento grande — click para asignar' : 'Click para asignar'}
                </p>
              </div>
            </div>
          </motion.div>
        )
      })()}

      {error && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          {error}
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarX size={40} weight="duotone" className="text-[var(--border-default)]" />}
          title="Sin reservas para hoy"
          description="Las reservas apareceran aqui cuando lleguen."
          className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]"
        />
      ) : (
        <motion.div
          className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
          variants={prefersReduced ? undefined : containerVariants}
          initial="hidden"
          animate="visible"
        >
          {Object.entries(groupedByTime).map(([timeLabel, reservations]) => {
            // Check if any reservation in this group is currently happening
            const isNow = reservations.some(r => {
              const startStr = r.time_start as string
              const endStr = r.time_end as string
              if (!startStr || !endStr) return false
              const startMin = timeToMinutes(startStr)
              const endMin = timeToMinutes(endStr)
              return colombiaNowMinutes >= startMin && colombiaNowMinutes <= endMin
            })
            const isUpcoming = !isNow && reservations.some(r => {
              const startStr = r.time_start as string
              if (!startStr) return false
              const startMin = timeToMinutes(startStr)
              return startMin > colombiaNowMinutes
            })
            
            return (
              <div key={timeLabel}>
                {/* Time group header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--text-primary)]">{timeLabel}</span>
                  {isNow && (
                    <span className="text-[10px] font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] bg-[var(--color-ak-borgona)]/10 dark:bg-[var(--color-ak-borgona-light)]/10 px-2 py-0.5 rounded-full">AHORA</span>
                  )}
                  {!isNow && isUpcoming && (
                    <span className="text-[10px] font-semibold text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] bg-[var(--color-ak-ambar)]/10 dark:bg-[var(--color-ak-ambar-light)]/10 px-2 py-0.5 rounded-full">PRÓXIMAS</span>
                  )}
                  <span className="text-[10px] text-[var(--text-secondary)] ml-auto">{reservations.length} reserva{reservations.length > 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px bg-[var(--border-default)] ml-2" />
                </div>

                {/* Reservation cards for this time group */}
                <div className="space-y-2">
                  {reservations.map(r => {
                    const id = r.id as string
                    const status = r.status as string
                    const timeStart = formatTime12((r.time_start as string) || '') || ''
                    const timeEnd = formatTime12((r.time_end as string) || '') || ''
                    const partySize = r.party_size as number
                    const customerName = (r.customers as { full_name: string } | null)?.full_name || 'Sin nombre'
                    const custData = r.customers as { full_name: string; phone: string; email: string } | null
                    const phone = custData?.phone || null
                    const email = custData?.email || null
                    const notes = r.special_requests as string | null
                    const hasDetails = !!(phone || email || notes)
                    const isExpanded = expanded.has(id)
                    const actions = HOST_ACTION_MAP[status] || []
                    const isConfirming = confirming === id

                    // Service type badge
                    const svc = getServiceType(String(r.time_start || ''))
                    const svcLabel = SERVICE_FILTERS.find(f => f.id === svc)?.label ?? ''

                    // Highlight reservations starting within 15 minutes
                    const startMin = timeToMinutes(r.time_start as string)
                    const diffMin = startMin - colombiaNowMinutes
                    const isUrgent = status === 'confirmed' &&
                      diffMin > 0 && diffMin <= fifteenMin

                    // Compact time display in group: only show end time
                    const timeDisplay = `— ${timeEnd}`

                    return (
                      <motion.div
                        key={id}
                        variants={prefersReduced ? undefined : itemVariants}
                        className={cn(
                          'bg-[var(--bg-card)] rounded-xl border p-3 md:p-4',
                          isUrgent ? 'border-[var(--color-ak-ambar)]/50 dark:border-[var(--color-ak-ambar-light)]/50 bg-[var(--color-ak-ambar)]/5 dark:bg-[var(--color-ak-ambar-light)]/10' : 'border-[var(--border-default)]',
                          status === 'seated' && 'opacity-60',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1"
                          >
                            <div className="flex items-center gap-2 mb-1"
                            >
                              <span className="text-xs text-[var(--text-secondary)]">{timeDisplay}</span>
                              <StatusBadge status={status} />
                              {status === 'seated' && <SeatedTimer reservation={r as any} compact />}
                              {isUrgent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] bg-[var(--color-ak-ambar)]/10 dark:bg-[var(--color-ak-ambar-light)]/10 px-2 py-0.5 rounded-full"
                                >
                                  <Clock size={10} weight="fill" />
                                  Proxima
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-[var(--text-primary)] break-words">{customerName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {partySize}p{r.zone_name ? ` · ${r.zone_name}` : ''}
                              <span className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium ml-1',
                                svc === 'lunch' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                                svc === 'dinner' && 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
                                svc === 'breakfast' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                              )}>
                                {svcLabel}
                              </span>
                            </p>
                            {(r.table_number as string | null) && (
                              <p className="text-xs text-[var(--color-ak-oliva)] dark:text-[var(--color-ak-oliva-light)] flex items-center gap-1">
                                <Armchair size={12} />
                                Mesa {r.table_number as string}{r.zone_name ? ` · ${r.zone_name as string}` : ''}
                              </p>
                            )}

                            {hasDetails && (
                              <div className="mt-1">
                                <button
                                  onClick={() => toggleExpand(id)}
                                  className="text-[10px] text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] flex items-center gap-0.5"
                                >
                                  {isExpanded ? <CaretUp size={10} /> : <CaretDown size={10} />}
                                  {isExpanded ? 'Menos' : 'Ver detalles'}
                                </button>
                              </div>
                            )}

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 space-y-3">
                                    {phone && (
                                      <a
                                        href={`https://wa.me/57${phone.replace(/^0+/, '').replace(/^\\+/, '')}`}
                                        target="_blank"
                                        className="flex items-center gap-1.5 text-xs text-[var(--color-success)] hover:underline"
                                      >
                                        <WhatsappLogo size={12} weight="fill" /> {phone}
                                      </a>
                                    )}
                                    {email && (
                                      <a
                                        href={`mailto:${email}`}
                                        className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
                                      >
                                        <EnvelopeSimple size={12} /> {email}
                                      </a>
                                    )}
                                    {notes && (
                                      <div className="flex items-start gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-primary)] rounded-md px-2 py-1">
                                        <Note size={12} className="text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)] shrink-0 mt-0.5" />
                                        <span>{notes}</span>
                                      </div>
                                    )}

                                    {/* Bitacora */}
                                    <AuditTimeline variant="host" reservationId={id} reservationCreatedAt={r.created_at as string | undefined} />

                                    {/* Notas del equipo */}
                                    <NotesPanel
                                      variant="host"
                                      reservationId={id}
                                      internalNotes={notesMap[id] ?? (r.internal_notes as string) ?? ''}
                                      onNotesUpdate={(val) => setNotesMap(prev => ({ ...prev, [id]: val }))}
                                    />
                                    {formatCreatedAt(r.created_at as string | null) && (
                                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                        <CalendarPlus size={12} className="shrink-0" />
                                        <span>Creada: {formatCreatedAt(r.created_at as string | null)}</span>
                                      </div>
                                    )}
                                    {status === 'seated' && <SeatedTimer reservation={r as any} />}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0"
                          >
                            {actions.map(action => (
                              <button
                                key={action.status}
                                onClick={() => requestStatusChange(id, action.status, action.label)}
                                disabled={isConfirming}
                                className={cn(
                                  'px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-lg text-white active:scale-[0.97] disabled:opacity-50',
                                  action.variant === 'primary' && 'bg-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] dark:hover:bg-[var(--color-ak-borgona-light)]/80',
                                  action.variant === 'warning' && 'bg-[var(--color-ak-ambar)] hover:bg-[var(--color-ak-ambar)]/90 dark:bg-[var(--color-ak-ambar-light)] dark:hover:bg-[var(--color-ak-ambar-light)]/80',
                                  action.variant === 'danger' && 'bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/80',
                                )} transition-all duration-200
                              >
                                {isConfirming ? '...' : action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirmar accion"
        description={`Estas seguro de marcar esta reserva como "${confirmDialog.label}"? Esta accion afecta la disponibilidad.`}
        confirmLabel={confirmDialog.label}
        confirmVariant={confirmDialog.status === 'cancelled' ? 'danger' : 'default'}
        onConfirm={() => {
          setConfirmDialog(prev => ({ ...prev, open: false }))
          handleStatusChange(confirmDialog.reservationId, confirmDialog.status)
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />

      {assignTarget && (
        <AssignTablePopup
          reservationId={assignTarget.id}
          partySize={assignTarget.partySize}
          customerName={assignTarget.customerName}
          timeStart={assignTarget.timeStart}
          timeEnd={assignTarget.timeEnd}
          onClose={() => setAssignTarget(null)}
          onAssigned={onAction}
        />
      )}
    </div>
  )
}