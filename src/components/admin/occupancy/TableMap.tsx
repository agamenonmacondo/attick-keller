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

                return (
                  <AnimatedCard key={tableId} delay={(zi * 8 + ti) * 0.03}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveTableId(isActive ? null : tableId)}
                        className={cn(
                          'w-full rounded-lg border-2 p-3 text-center cursor-pointer hover:shadow-md active:scale-[0.97]',
                          isOccupied ? 'bg-[#6B2737]/10 border-[#6B2737]/30' : 'bg-white border-[#D7CCC8]',
                          isActive && 'ring-2 ring-[#6B2737]/40',
                        )}
                        style={{ transition: 'transform 160ms ease-out, box-shadow 200ms ease-out' }}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isOccupied ? '#6B2737' : '#5C7A4D' }} />
                          <span className="text-sm font-semibold text-[#3E2723]">{displayName}</span>
                          {nameAttick && <span className="text-[10px] text-[#8D6E63]">({number})</span>}
                        </div>
                        <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
                        {isOccupied && (
                          <div className="mt-1 pt-1 border-t border-[#D7CCC8]/50">
                            <p className="text-[10px] font-medium text-[#3E2723] truncate">{customer}</p>
                            <p className="text-[9px] text-[#8D6E63]">{partySize}p · {time}</p>
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

              return (
                <AnimatedCard key={tableId} delay={ti * 0.03}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveTableId(isActive ? null : tableId)}
                      className={cn(
                        'w-full rounded-lg border-2 border-dashed p-3 text-center cursor-pointer hover:shadow-md active:scale-[0.97]',
                        isOccupied ? 'bg-[#6B2737]/10 border-[#6B2737]/30' : 'bg-[#EFEBE9] border-[#D7CCC8]',
                        isActive && 'ring-2 ring-[#6B2737]/40',
                      )}
                      style={{ transition: 'transform 160ms ease-out, box-shadow 200ms ease-out' }}
                    >
                      <span className="text-sm font-semibold text-[#3E2723]">{displayName}</span>
                      {nameAttick && <span className="text-[10px] text-[#8D6E63] ml-0.5">({number})</span>}
                      <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
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