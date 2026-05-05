'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { formatTimeRangeColombia } from '@/lib/utils/time'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'
import {
  CaretDown,
  CaretUp,
  WhatsappLogo,
  EnvelopeSimple,
  Note,
  Clock,
} from '@phosphor-icons/react'

const STATUS_CONFIG: Record<
  ReservationTimeline['status'],
  { label: string; dotClass: string; bgClass: string }
> = {
  confirmed: { label: 'Confirmado', dotClass: 'bg-green-600', bgClass: 'bg-green-50' },
  pre_paid: { label: 'Pre-pagado', dotClass: 'bg-green-600', bgClass: 'bg-green-50' },
  seated: { label: 'Sentados', dotClass: 'bg-green-600', bgClass: 'bg-green-50' },
  pending: { label: 'Pendiente', dotClass: 'bg-[#D4922A]', bgClass: 'bg-[#D4922A]/5' },
  no_show: { label: 'No asistió', dotClass: 'bg-red-600', bgClass: 'bg-red-50' },
  cancelled: { label: 'Cancelada', dotClass: 'bg-gray-400', bgClass: 'bg-gray-50' },
  completed: { label: 'Completado', dotClass: 'bg-gray-400', bgClass: 'bg-gray-50' },
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
  const config = STATUS_CONFIG[reservation.status]

  const hasDetails = reservation.customer_phone || reservation.customer_email || reservation.special_requests

  return (
    <div className="text-sm">
      {/* Header row — always visible */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between gap-2 text-left',
          hasDetails && 'cursor-pointer',
          !hasDetails && 'cursor-default'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {reservation.is_current && (
            <span className="w-2 h-2 rounded-full bg-[#6B2737] shrink-0" />
          )}
          {reservation.is_upcoming && !reservation.is_current && (
            <Clock size={12} className="text-[#D4922A] shrink-0" />
          )}
          <span className="font-medium text-[#3E2723] break-words">
            {reservation.customer_name || 'Sin nombre'}
          </span>
          <span className="text-[#8D6E63] shrink-0">
            {reservation.party_size} {reservation.party_size === 1 ? 'persona' : 'personas'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[#8D6E63]">
            {reservation.time_start.slice(0, 5)}–{reservation.time_end.slice(0, 5)}
          </span>
          {hasDetails && (
            expanded ? <CaretUp size={12} className="text-[#8D6E63]" /> : <CaretDown size={12} className="text-[#8D6E63]" />
          )}
        </div>
      </button>

      {/* Status row */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
        <span className="text-[10px] uppercase tracking-wider text-[#8D6E63]">{config.label}</span>
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
            <div className="mt-1.5 space-y-1 pl-1 border-l-2 border-[#D7CCC8] ml-0.5">
              {reservation.customer_phone && (
                <a
                  href={getWhatsAppUrl(reservation.customer_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#25D366] hover:text-[#128C7E] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <WhatsappLogo size={12} weight="fill" />
                  {reservation.customer_phone}
                </a>
              )}
              {reservation.customer_email && (
                <a
                  href={`mailto:${reservation.customer_email}`}
                  className="flex items-center gap-1.5 text-xs text-[#1565C0] hover:text-[#0D47A1] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EnvelopeSimple size={12} />
                  {reservation.customer_email}
                </a>
              )}
              {reservation.special_requests && (
                <div
                  className="flex items-start gap-1.5 text-xs text-[#5D4037] bg-[#F5EDE0] rounded-md px-2 py-1"
                >
                  <Note size={12} className="mt-0.5 shrink-0 text-[#D4922A]" />
                  <span>{reservation.special_requests}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { ReservationDetailProps }
