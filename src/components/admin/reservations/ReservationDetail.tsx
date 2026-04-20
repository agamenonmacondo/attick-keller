'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, WhatsappLogo, Envelope } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatTime } from '@/lib/utils/formatDate'
import { whatsappLink, emailLink } from '@/lib/utils/whatsapp'
import { StatusBadge } from '../shared/StatusBadge'
import { SectionHeading } from '../shared/SectionHeading'

interface ReservationDetailItem {
  id: string
  date: string
  time_start: string
  time_end: string
  party_size: number
  status: string
  source: string
  special_requests: string | null
  customers: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
  zone_name: string | null
  [key: string]: unknown
}

interface ReservationDetailProps {
  reservation: ReservationDetailItem | null
  onStatusChange: (id: string, status: string) => void
  onClose: () => void
}

const ACTION_MAP: Record<
  string,
  Array<{ status: string; label: string; variant: 'primary' | 'danger' }>
> = {
  pending: [
    { status: 'confirmed', label: 'Confirmar', variant: 'primary' },
    { status: 'cancelled', label: 'Cancelar', variant: 'danger' },
  ],
  confirmed: [
    { status: 'seated', label: 'Sentar', variant: 'primary' },
  ],
  seated: [
    { status: 'completed', label: 'Completar', variant: 'primary' },
  ],
}

export function ReservationDetail({
  reservation,
  onStatusChange,
  onClose,
}: ReservationDetailProps) {
  return (
    <AnimatePresence mode="wait">
      {reservation ? (
        <motion.div
          key={reservation.id}
          initial={{ opacity: 0, transform: 'translateX(30px)' }}
          animate={{ opacity: 1, transform: 'translateX(0)' }}
          exit={{ opacity: 0, transform: 'translateX(30px)' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="sticky top-20 overflow-hidden rounded-xl border border-[#D7CCC8] bg-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4">
            <div>
              <h2 className="font-['Playfair_Display'] text-base font-semibold text-[#3E2723]">
                {reservation.customers?.full_name || 'Cliente'}
              </h2>
              <StatusBadge status={reservation.status} size="md" className="mt-1" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50 active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5 px-5 pb-5">
            {/* Customer contact */}
            <div>
              <SectionHeading>Contacto</SectionHeading>
              <div className="space-y-2">
                {reservation.customers?.phone && (
                  <a
                    href={whatsappLink(
                      reservation.customers.phone,
                      `Hola ${reservation.customers?.full_name || ''}, te escribo de Attick & Keller`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#3E2723] hover:bg-[#D7CCC8]/30 active:scale-[0.97]"
                    style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                  >
                    <WhatsappLogo size={16} className="text-emerald-600" weight="fill" />
                    {reservation.customers.phone}
                  </a>
                )}
                {reservation.customers?.email && (
                  <a
                    href={emailLink(
                      reservation.customers.email,
                      `Reserva Attick & Keller - ${formatDate(reservation.date, 'short')}`,
                    )}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#3E2723] hover:bg-[#D7CCC8]/30 active:scale-[0.97]"
                    style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                  >
                    <Envelope size={16} className="text-[#6B2737]" weight="fill" />
                    {reservation.customers.email}
                  </a>
                )}
                {!reservation.customers?.phone && !reservation.customers?.email && (
                  <p className="text-xs text-[#8D6E63]">Sin datos de contacto</p>
                )}
              </div>
            </div>

            {/* Reservation info */}
            <div>
              <SectionHeading>Reserva</SectionHeading>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Fecha</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {formatDate(reservation.date, 'weekday')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Hora</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {formatTime(reservation.time_start)} - {formatTime(reservation.time_end)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Zona</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {reservation.zone_name || '\u2014'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#8D6E63]">Invitados</dt>
                  <dd className="font-medium text-[#3E2723]">
                    {reservation.party_size} personas
                  </dd>
                </div>
                {reservation.special_requests && (
                  <div className="pt-1">
                    <dt className="text-[#8D6E63]">Notas</dt>
                    <dd className="mt-0.5 rounded-lg bg-[#EFEBE9] p-2 text-xs text-[#3E2723]">
                      {reservation.special_requests}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Action buttons */}
            {ACTION_MAP[reservation.status] && (
              <div className="space-y-2 border-t border-[#D7CCC8] pt-4">
                <SectionHeading>Acciones</SectionHeading>
                {ACTION_MAP[reservation.status].map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => onStatusChange(reservation.id, action.status)}
                    className={cn(
                      'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white active:scale-[0.97]',
                      action.variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-[#6B2737] hover:bg-[#6B2737]/90',
                    )}
                    style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="sticky top-20 flex flex-col items-center justify-center rounded-xl border border-[#D7CCC8] bg-white/30 py-16 text-center"
        >
          <div className="mb-3 text-[#BCAAA4]">
            <Envelope size={32} />
          </div>
          <p className="text-sm font-medium text-[#3E2723]">Selecciona una reserva</p>
          <p className="mt-1 text-xs text-[#8D6E63]">
            Haz clic en una reserva para ver los detalles
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}