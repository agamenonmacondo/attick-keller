'use client'

import { useState, useRef, useEffect } from 'react'
import { X, User, WhatsappLogo, EnvelopeSimple, Note, CaretDown, CaretUp } from '@phosphor-icons/react'
import { formatTime } from '@/lib/utils/formatDate'
import { motion, AnimatePresence } from 'framer-motion'

interface UnassignedReservation {
  id: string
  party_size: number
  time_start: string
  time_end: string
  customer_name: string | null
}

interface TableActionPopoverProps {
  tableId: string
  tableNumber: string
  capacity: number
  isOccupied: boolean
  currentCustomerName: string | null
  currentTime: string | null
  currentReservationId: string | null
  currentPartySize: number | null
  currentCustomerPhone: string | null
  currentCustomerEmail: string | null
  currentSpecialRequests: string | null
  currentReservationStatus: string | null
  unassignedReservations: UnassignedReservation[]
  onAssign: (reservationId: string, tableId: string) => void
  onUnassign: (reservationId: string) => void
  onClose: () => void
}

export function TableActionPopover({
  tableId,
  tableNumber,
  capacity,
  isOccupied,
  currentCustomerName,
  currentTime,
  currentReservationId,
  currentPartySize,
  currentCustomerPhone,
  currentCustomerEmail,
  currentSpecialRequests,
  currentReservationStatus,
  unassignedReservations,
  onAssign,
  onUnassign,
  onClose,
}: TableActionPopoverProps) {
  const [assigning, setAssigning] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasDetails = !!(currentCustomerPhone || currentCustomerEmail || currentSpecialRequests)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleAssign = async (reservationId: string) => {
    setAssigning(true)
    await onAssign(reservationId, tableId)
  }

  const handleUnassign = async () => {
    if (!currentReservationId) return
    setAssigning(true)
    await onUnassign(currentReservationId)
  }

  const handleStatusAction = async (newStatus: string) => {
    if (!currentReservationId) return
    setActionLoading(newStatus)
    try {
      await fetch(`/api/admin/reservations/${currentReservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onClose()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1 w-56 rounded-xl border border-[#D7CCC8] bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[#D7CCC8] px-3 py-2">
        <span className="text-xs font-medium text-[#3E2723]">Mesa {tableNumber} ({capacity}p)</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
        >
          <X size={12} />
        </button>
      </div>

      {isOccupied ? (
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-[#6B2737]" />
            <span className="text-sm text-[#3E2723]">{currentCustomerName || 'Cliente'}</span>
          </div>
          <p className="text-xs text-[#8D6E63]">
            {currentTime} · {currentPartySize}p
          </p>

          {/* Customer details expand/collapse */}
          {hasDetails && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[10px] text-[#D4922A]"
              >
                {showDetails ? <CaretUp size={10} /> : <CaretDown size={10} />}
                {showDetails ? 'Menos detalles' : 'Ver detalles'}
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pl-3 border-l-2 border-[#D7CCC8]">
                      {currentCustomerPhone && (
                        <a
                          href={`https://wa.me/57${currentCustomerPhone.replace(/^0+/, '').replace(/^\+/, '')}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-xs text-[#25D366] hover:underline"
                        >
                          <WhatsappLogo size={12} weight="fill" /> {currentCustomerPhone}
                        </a>
                      )}
                      {currentCustomerEmail && (
                        <a
                          href={`mailto:${currentCustomerEmail}`}
                          className="flex items-center gap-1.5 text-xs text-[#1565C0] hover:underline"
                        >
                          <EnvelopeSimple size={12} /> {currentCustomerEmail}
                        </a>
                      )}
                      {currentSpecialRequests && (
                        <div className="flex items-start gap-1.5 text-xs text-[#5D4037] bg-[#F5EDE0] rounded-md px-2 py-1">
                          <Note size={12} className="text-[#D4922A] shrink-0 mt-0.5" />
                          <span>{currentSpecialRequests}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Action buttons based on reservation status */}
          <div className="space-y-1.5 pt-1">
            {currentReservationStatus && ['confirmed', 'pre_paid'].includes(currentReservationStatus) && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusAction('seated')}
                  disabled={actionLoading !== null}
                  className="w-full rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {actionLoading === 'seated' ? '...' : 'Sentar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusAction('no_show')}
                  disabled={actionLoading !== null}
                  className="w-full rounded-lg border border-[#D4922A] bg-amber-50 px-3 py-1.5 text-xs font-medium text-[#D4922A] hover:bg-amber-100 disabled:opacity-50"
                >
                  {actionLoading === 'no_show' ? '...' : 'No asistió'}
                </button>
              </>
            )}
            {currentReservationStatus === 'seated' && (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={assigning}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                {assigning ? 'Liberando...' : 'Liberar mesa'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 py-2">
          {unassignedReservations.length === 0 ? (
            <p className="py-2 text-center text-xs text-[#8D6E63]">Sin reservas por asignar</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-medium text-[#8D6E63] mb-1">Asignar reserva:</p>
              {unassignedReservations.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleAssign(r.id)}
                  disabled={assigning}
                  className="w-full text-left rounded-lg border border-[#D7CCC8] px-2.5 py-2 text-xs hover:bg-[#EFEBE9] disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#3E2723]">{r.customer_name || 'Cliente'}</span>
                    <span className="text-[#8D6E63]">{r.party_size}p</span>
                  </div>
                  <span className="text-[10px] text-[#8D6E63]">
                    {formatTime(r.time_start)} - {formatTime(r.time_end)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
