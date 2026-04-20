'use client'

import { useState, useRef, useEffect } from 'react'
import { X, User } from '@phosphor-icons/react'
import { formatTime } from '@/lib/utils/formatDate'

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
  unassignedReservations,
  onAssign,
  onUnassign,
  onClose,
}: TableActionPopoverProps) {
  const [assigning, setAssigning] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    // parent handles refetch + close
  }

  const handleUnassign = async () => {
    if (!currentReservationId) return
    setAssigning(true)
    await onUnassign(currentReservationId)
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
          <button
            type="button"
            onClick={handleUnassign}
            disabled={assigning}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {assigning ? 'Liberando...' : 'Liberar mesa'}
          </button>
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