'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'
import { formatTime12 } from '@/lib/utils/format-time'
import {
  CaretDown,
  CaretUp,
  WhatsappLogo,
  EnvelopeSimple,
  Note,
  Clock,
  ChatCircle,
  LockKey,
} from '@phosphor-icons/react'
import { HostAuditTimeline } from './HostAuditTimeline'
import { HostNotesPanel } from './HostNotesPanel'

const STATUS_CONFIG: Record<
  ReservationTimeline['status'],
  { label: string; dotClass: string; bgClass: string }
> = {
  confirmed: { label: 'Confirmada', dotClass: 'bg-[var(--color-ak-ambar)]', bgClass: 'bg-[var(--color-ak-ambar)]/5' },
  pre_paid: { label: 'Confirmada', dotClass: 'bg-[var(--color-ak-ambar)]', bgClass: 'bg-[var(--color-ak-ambar)]/5' },
  seated: { label: 'Sentados', dotClass: 'bg-[var(--color-ak-borgona)]', bgClass: 'bg-[var(--color-ak-borgona)]/5' },
  pending: { label: 'Pendiente', dotClass: 'bg-[var(--color-ak-ambar)]', bgClass: 'bg-[var(--color-ak-ambar)]/5' },
  no_show: { label: 'No asistio', dotClass: 'bg-[var(--color-danger)]', bgClass: 'bg-[var(--color-danger)]/10' },
  cancelled: { label: 'Cancelada', dotClass: 'bg-[var(--text-muted)]', bgClass: 'bg-[var(--bg-primary)]' },
  completed: { label: 'Completado', dotClass: 'bg-[var(--text-muted)]', bgClass: 'bg-[var(--bg-primary)]' },
}

function getWhatsAppUrl(phone: string): string {
  const cleaned = phone.replace(/^0+/, '').replace(/^\+/, '')
  const number = cleaned.startsWith('57') ? cleaned : `57${cleaned}`
  return `https://wa.me/${number}`
}

interface ReservationDetailProps {
  reservation: ReservationTimeline
  compact?: boolean
}

export function ReservationDetail({ reservation, compact = false }: ReservationDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const [internalNotes, setInternalNotes] = useState(reservation.internal_notes ?? '')
  const config = STATUS_CONFIG[reservation.status]

  const hasDetails = reservation.customer_phone || reservation.customer_email || reservation.special_requests || reservation.id

  return (
    <div className="text-sm">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {reservation.is_current && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-ak-borgona)] shrink-0" />
          )}
          {reservation.is_upcoming && !reservation.is_current && (
            <Clock size={12} className="text-[var(--color-ak-ambar)] shrink-0" />
          )}
          <span className="font-medium text-[var(--text-primary)] break-words">
            {reservation.customer_name || 'Sin nombre'}
          </span>
          <span className="text-[var(--text-secondary)] shrink-0">
            {reservation.party_size}p
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            {formatTime12(reservation.time_start)} – {formatTime12(reservation.time_end)}
          </span>
          {expanded ? <CaretUp size={12} className="text-[var(--text-secondary)]" /> : <CaretDown size={12} className="text-[var(--text-secondary)]" />}
        </div>
      </button>

      {/* Status row */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{config.label}</span>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-3">
              {/* Contact info + special requests */}
              <div className="space-y-1.5">
                {reservation.customer_phone && (
                  <a
                    href={getWhatsAppUrl(reservation.customer_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--color-success)] hover:text-[var(--color-success)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <WhatsappLogo size={14} weight="fill" />
                    {reservation.customer_phone}
                  </a>
                )}
                {reservation.customer_email && (
                  <a
                    href={`mailto:${reservation.customer_email}`}
                    className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EnvelopeSimple size={14} />
                    {reservation.customer_email}
                  </a>
                )}
                {reservation.special_requests && (
                  <div className="flex items-start gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-primary)] rounded-lg px-3 py-2">
                    <Note size={14} className="mt-0.5 shrink-0 text-[var(--color-ak-ambar)]" />
                    <span>{reservation.special_requests}</span>
                  </div>
                )}
              </div>

              {/* Bitacora — host-specific component */}
              <HostAuditTimeline
                reservationId={reservation.id}
                reservationCreatedAt={reservation.created_at}
              />

              {/* Notas del equipo — host-specific component */}
              <HostNotesPanel
                reservationId={reservation.id}
                internalNotes={internalNotes}
                onNotesUpdate={setInternalNotes}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { ReservationDetailProps }