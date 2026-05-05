'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { TableActionPopover } from './TableActionPopover'

interface UnassignedReservation {
  id: string
  party_size: number
  time_start: string
  time_end: string
  customer_name: string | null
}

interface TableMapProps {
  zones: Array<Record<string, unknown>>
  unassignedTables: Array<Record<string, unknown>>
  unassignedReservations: UnassignedReservation[]
  onAssign: (reservationId: string, tableId: string) => Promise<void>
  onUnassign: (reservationId: string) => Promise<void>
}

export function TableMap({ zones, unassignedTables, unassignedReservations, onAssign, onUnassign }: TableMapProps) {
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  const handleAssign = useCallback(async (reservationId: string, tableId: string) => {
    await onAssign(reservationId, tableId)
    setActiveTableId(null)
  }, [onAssign])

  const handleUnassign = useCallback(async (reservationId: string) => {
    await onUnassign(reservationId)
    setActiveTableId(null)
  }, [onUnassign])

  return (
    <div className="space-y-8">
      {zones.map((zone, zi) => {
        const tables = (zone.tables as Array<Record<string, unknown>>) || []
        if (tables.length === 0) return null
        return (
          <div key={String(zone.id)}>
            <SectionHeading>{String(zone.name)}</SectionHeading>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {tables.map((table, ti) => {
                const isOccupied = table.is_occupied as boolean
                const hasUpcomingReservation = (table.reservations as Array<Record<string, unknown>> | undefined)?.some(
                  (r) => r.is_upcoming === true || r.is_current === true
                ) ?? false
                const showReservationInfo = isOccupied || hasUpcomingReservation
                const capacity = table.capacity as number
                const number = String(table.number)
                const nameAttick = table.name_attick as string | null
                const displayName = nameAttick || `Mesa ${number}`
                const customer = table.current_customer_name as string | null
                const time = table.current_time as string | null
                const partySize = table.current_party_size as number | null
                const reservationId = table.current_reservation_id as string | null
                const tableId = String(table.id)
                const isActive = activeTableId === tableId
                const reservationStatus = table.reservation_status as string | null
                const customerPhone = table.current_customer_phone as string | null
                const customerEmail = table.current_customer_email as string | null
                const specialRequests = table.current_special_requests as string | null

                const statusColor = !showReservationInfo ? '#5C7A4D'
                  : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? '#D4922A'
                  : reservationStatus === 'seated' ? '#6B2737'
                  : '#9E9E9E'

                const statusLabel = !reservationStatus ? 'Libre'
                  : reservationStatus === 'confirmed' ? 'Confirmado'
                  : reservationStatus === 'pre_paid' ? 'Pre-pagado'
                  : reservationStatus === 'seated' ? 'Sentado'
                  : reservationStatus === 'completed' ? 'Completado'
                  : reservationStatus === 'no_show' ? 'No asistió'
                  : reservationStatus

                const statusBadgeBg = !showReservationInfo ? 'bg-green-50'
                  : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'bg-amber-50'
                  : reservationStatus === 'seated' ? 'bg-[#6B2737]/10'
                  : 'bg-gray-50'

                const statusBadgeText = !showReservationInfo ? 'text-green-700'
                  : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'text-[#D4922A]'
                  : reservationStatus === 'seated' ? 'text-[#6B2737]'
                  : 'text-gray-500'

                const statusDotColor = !showReservationInfo ? 'bg-green-600'
                  : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'bg-[#D4922A]'
                  : reservationStatus === 'seated' ? 'bg-[#6B2737]'
                  : 'bg-gray-400'

                return (
                  <AnimatedCard key={tableId} delay={(zi * 8 + ti) * 0.03}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveTableId(isActive ? null : tableId)}
                        className={cn(
                          'w-full rounded-lg border-2 p-3 text-center cursor-pointer hover:shadow-md active:scale-[0.97]',
                          showReservationInfo ? 'bg-white border-[#D7CCC8]' : 'bg-white border-[#D7CCC8]',
                          isActive && 'ring-2 ring-[#6B2737]/40',
                        )}
                        style={{ transition: 'transform 160ms ease-out, box-shadow 200ms ease-out' }}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                          <span className="text-sm font-semibold text-[#3E2723]">{displayName}</span>
                          {nameAttick && <span className="text-[10px] text-[#8D6E63]">({number})</span>}
                        </div>
                        <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
                        {showReservationInfo && (
                          <div className="mt-1 pt-1 border-t border-[#D7CCC8]/50">
                            <p className="text-[10px] font-medium text-[#3E2723] truncate">{customer}</p>
                            <p className="text-[9px] text-[#8D6E63]">{partySize}p · {time}</p>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] ${statusBadgeBg} ${statusBadgeText}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
                              {statusLabel}
                            </span>
                          </div>
                        )}
                      </button>
                      {isActive && (
                        <TableActionPopover
                          tableId={tableId}
                          tableNumber={number}
                          capacity={capacity}
                          isOccupied={isOccupied}
                          currentCustomerName={customer}
                          currentTime={time}
                          currentReservationId={reservationId}
                          currentPartySize={partySize}
                          currentCustomerPhone={customerPhone}
                          currentCustomerEmail={customerEmail}
                          currentSpecialRequests={specialRequests}
                          currentReservationStatus={reservationStatus}
                          unassignedReservations={unassignedReservations}
                          onAssign={handleAssign}
                          onUnassign={handleUnassign}
                          onClose={() => setActiveTableId(null)}
                        />
                      )}
                    </div>
                  </AnimatedCard>
                )
              })}
            </div>
          </div>
        )
      })}
      {unassignedTables.length > 0 && (
        <div>
          <SectionHeading>Sin zona asignada</SectionHeading>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {unassignedTables.map((table, ti) => {
              const isOccupied = table.is_occupied as boolean
              const hasUpcomingReservation = (table.reservations as Array<Record<string, unknown>> | undefined)?.some(
                (r) => r.is_upcoming === true || r.is_current === true
              ) ?? false
              const showReservationInfo = isOccupied || hasUpcomingReservation
              const capacity = table.capacity as number
              const number = String(table.number)
              const nameAttick = table.name_attick as string | null
              const displayName = nameAttick || `Mesa ${number}`
              const customer = table.current_customer_name as string | null
              const time = table.current_time as string | null
              const partySize = table.current_party_size as number | null
              const reservationId = table.current_reservation_id as string | null
              const tableId = String(table.id)
              const isActive = activeTableId === tableId
              const reservationStatus = table.reservation_status as string | null
              const customerPhone = table.current_customer_phone as string | null
              const customerEmail = table.current_customer_email as string | null
              const specialRequests = table.current_special_requests as string | null

              const statusColor = !showReservationInfo ? '#5C7A4D'
                : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? '#D4922A'
                : reservationStatus === 'seated' ? '#6B2737'
                : '#9E9E9E'

              const statusLabel = !reservationStatus ? 'Libre'
                : reservationStatus === 'confirmed' ? 'Confirmado'
                : reservationStatus === 'pre_paid' ? 'Pre-pagado'
                : reservationStatus === 'seated' ? 'Sentado'
                : reservationStatus === 'completed' ? 'Completado'
                : reservationStatus === 'no_show' ? 'No asistió'
                : reservationStatus

              const statusBadgeBg = !showReservationInfo ? 'bg-green-50'
                : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'bg-amber-50'
                : reservationStatus === 'seated' ? 'bg-[#6B2737]/10'
                : 'bg-gray-50'

              const statusBadgeText = !showReservationInfo ? 'text-green-700'
                : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'text-[#D4922A]'
                : reservationStatus === 'seated' ? 'text-[#6B2737]'
                : 'text-gray-500'

              const statusDotColor = !showReservationInfo ? 'bg-green-600'
                : (reservationStatus === 'confirmed' || reservationStatus === 'pre_paid') ? 'bg-[#D4922A]'
                : reservationStatus === 'seated' ? 'bg-[#6B2737]'
                : 'bg-gray-400'

              return (
                <AnimatedCard key={tableId} delay={ti * 0.03}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveTableId(isActive ? null : tableId)}
                      className={cn(
                        'w-full rounded-lg border-2 border-dashed p-3 text-center cursor-pointer hover:shadow-md active:scale-[0.97]',
                        isOccupied ? 'bg-white border-[#D7CCC8]' : 'bg-[#EFEBE9] border-[#D7CCC8]',
                        isActive && 'ring-2 ring-[#6B2737]/40',
                      )}
                      style={{ transition: 'transform 160ms ease-out, box-shadow 200ms ease-out' }}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {showReservationInfo && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />}
                        <span className="text-sm font-semibold text-[#3E2723]">{displayName}</span>
                        {nameAttick && <span className="text-[10px] text-[#8D6E63] ml-0.5">({number})</span>}
                      </div>
                      <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
                      {showReservationInfo && (
                        <div className="mt-1 pt-1 border-t border-[#D7CCC8]/50">
                          <p className="text-[10px] font-medium text-[#3E2723] truncate">{customer}</p>
                          <p className="text-[9px] text-[#8D6E63]">{partySize}p · {time}</p>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] ${statusBadgeBg} ${statusBadgeText}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
                            {statusLabel}
                          </span>
                        </div>
                      )}
                    </button>
                    {isActive && (
                      <TableActionPopover
                        tableId={tableId}
                        tableNumber={number}
                        capacity={capacity}
                        isOccupied={isOccupied}
                        currentCustomerName={customer}
                        currentTime={time}
                        currentReservationId={reservationId}
                        currentPartySize={partySize}
                        currentCustomerPhone={customerPhone}
                        currentCustomerEmail={customerEmail}
                        currentSpecialRequests={specialRequests}
                        currentReservationStatus={reservationStatus}
                        unassignedReservations={unassignedReservations}
                        onAssign={handleAssign}
                        onUnassign={handleUnassign}
                        onClose={() => setActiveTableId(null)}
                      />
                    )}
                  </div>
                </AnimatedCard>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}