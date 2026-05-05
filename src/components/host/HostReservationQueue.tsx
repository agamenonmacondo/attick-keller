'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { StatusBadge } from '../admin/shared/StatusBadge'
import { EmptyState } from '../admin/shared/EmptyState'
import { ConfirmDialog } from '../admin/shared/ConfirmDialog'
import { SectionHeading } from '../admin/shared/SectionHeading'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import { Check, X, Armchair, CalendarX, Warning, Clock, WhatsappLogo, EnvelopeSimple, Note, CaretDown, CaretUp } from '@phosphor-icons/react'

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
    { status: 'no_show', label: 'No asistio', variant: 'warning' },
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

interface HostReservationQueueProps {
  reservations: Array<Record<string, unknown>>
  onAction: () => void
}

export function HostReservationQueue({ reservations, onAction }: HostReservationQueueProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    reservationId: string
    status: string
    label: string
  }>({ open: false, reservationId: '', status: '', label: '' })
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

  // Sort by time_start
  const sorted = [...reservations].sort((a, b) =>
    String(a.time_start || '').localeCompare(String(b.time_start || ''))
  )

  const now = new Date()
  const fifteenMin = 15 * 60 * 1000
  const todayStr = now.toISOString().split('T')[0]

  return (
    <div className="space-y-3"
    >
      <SectionHeading>Reservas de Hoy</SectionHeading>

      {error && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarX size={40} weight="duotone" className="text-[#D7CCC8]" />}
          title="Sin reservas para hoy"
          description="Las reservas apareceran aqui cuando lleguen."
          className="bg-white rounded-xl border border-[#D7CCC8]"
        />
      ) : (
        <motion.div
          className="space-y-2 max-h-[60vh] overflow-y-auto pr-1"
          variants={prefersReduced ? undefined : containerVariants}
          initial="hidden"
          animate="visible"
        >
          {sorted.map(r => {
            const id = r.id as string
            const status = r.status as string
            const timeStart = (r.time_start as string)?.slice(0, 5) || ''
            const timeEnd = (r.time_end as string)?.slice(0, 5) || ''
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

            // Highlight reservations starting within 15 minutes
            const startDateTime = new Date(`${todayStr}T${r.time_start as string}`)
            const isUrgent = status === 'confirmed' &&
              startDateTime.getTime() - now.getTime() < fifteenMin &&
              startDateTime.getTime() > now.getTime() - fifteenMin

            return (
              <motion.div
                key={id}
                variants={prefersReduced ? undefined : itemVariants}
                className={cn(
                  'bg-white rounded-xl border p-3 md:p-4',
                  isUrgent ? 'border-[#D4922A]/50 bg-[#D4922A]/5' : 'border-[#D7CCC8]',
                  status === 'seated' && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2 mb-1"
                    >
                      <span className="text-base md:text-lg font-bold font-['Playfair_Display'] text-[#3E2723]"
                      >
                        {timeStart}
                      </span>
                      <span className="text-xs text-[#8D6E63]">— {timeEnd}</span>
                      <StatusBadge status={status} />
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#D4922A] bg-[#D4922A]/10 px-2 py-0.5 rounded-full"
                        >
                          <Clock size={10} weight="fill" />
                          Proxima
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#3E2723] break-words">{customerName}</p>
                    <p className="text-xs text-[#8D6E63]">
                      {partySize} personas{r.zone_name ? ` · ${r.zone_name}` : ''}
                    </p>
                    {(r.table_number as string | null) && (
                      <p className="text-xs text-[#5C7A4D] flex items-center gap-1">
                        <Armchair size={12} />
                        Mesa {r.table_number as string}{r.zone_name ? ` · ${r.zone_name as string}` : ''}
                      </p>
                    )}

                    {hasDetails && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleExpand(id)}
                          className="text-[10px] text-[#D4922A] flex items-center gap-0.5"
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
                          <div className="mt-2 space-y-1 pl-3 border-l-2 border-[#D7CCC8]">
                            {phone && (
                              <a
                                href={`https://wa.me/57${phone.replace(/^0+/, '').replace(/^\+/, '')}`}
                                target="_blank"
                                className="flex items-center gap-1.5 text-xs text-[#25D366] hover:underline"
                              >
                                <WhatsappLogo size={12} weight="fill" /> {phone}
                              </a>
                            )}
                            {email && (
                              <a
                                href={`mailto:${email}`}
                                className="flex items-center gap-1.5 text-xs text-[#1565C0] hover:underline"
                              >
                                <EnvelopeSimple size={12} /> {email}
                              </a>
                            )}
                            {notes && (
                              <div className="flex items-start gap-1.5 text-xs text-[#5D4037] bg-[#F5EDE0] rounded-md px-2 py-1">
                                <Note size={12} className="text-[#D4922A] shrink-0 mt-0.5" />
                                <span>{notes}</span>
                              </div>
                            )}
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
                          action.variant === 'primary' && 'bg-[#6B2737] hover:bg-[#5C2230]',
                          action.variant === 'warning' && 'bg-[#D4922A] hover:bg-[#D4922A]/90',
                          action.variant === 'danger' && 'bg-red-600 hover:bg-red-700',
                        )}
                        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                      >
                        {isConfirming ? '...' : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
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
    </div>
  )
}
