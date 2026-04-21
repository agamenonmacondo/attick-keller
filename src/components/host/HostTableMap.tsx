'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { StatusBadge } from '../admin/shared/StatusBadge'

interface TableItem {
  id: string
  number: string
  capacity: number
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
  can_combine: boolean
  combine_group: string | null
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
}

export function HostTableMap({ zones, reservations, onAction }: HostTableMapProps) {
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  // Unassigned reservations (confirmed/pre_paid with no table)
  const unassignedReservations = reservations.filter(
    r => ['confirmed', 'pre_paid', 'pending'].includes(r.status as string) && !r.table_id
  ) as Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>

  const handleAssign = async (reservationId: string, tableId: string) => {
    await fetch(`/api/admin/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId }),
    })
    setActiveTableId(null)
    onAction()
  }

  const handleUnassign = async (reservationId: string) => {
    await fetch(`/api/admin/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: null }),
    })
    setActiveTableId(null)
    onAction()
  }

  return (
    <div className="space-y-4">
      <h2 className="font-['Playfair_Display'] text-lg md:text-xl font-bold text-[#3E2723]">
        Mapa de Mesas
      </h2>

      {zones.map(zone => (
        <div key={zone.id}>
          <h3 className="text-sm font-medium text-[#5D4037] uppercase tracking-wider mb-2">
            {zone.name}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {zone.tables.map(table => (
              <HostTableCard
                key={table.id}
                table={table}
                isActive={activeTableId === table.id}
                unassignedReservations={unassignedReservations}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
                onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {zones.length === 0 && (
        <p className="text-[#8D6E63] text-center py-8">No hay zonas configuradas</p>
      )}
    </div>
  )
}

function HostTableCard({
  table,
  isActive,
  unassignedReservations,
  onAssign,
  onUnassign,
  onClick,
}: {
  table: TableItem
  isActive: boolean
  unassignedReservations: Array<{ id: string; party_size: number; time_start: string; customers: { full_name: string } | null }>
  onAssign: (reservationId: string, tableId: string) => Promise<void>
  onUnassign: (reservationId: string) => Promise<void>
  onClick: () => void
}) {
  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        className={cn(
          'w-full rounded-xl border-2 p-2 md:p-3 text-left transition-colors',
          table.is_occupied
            ? 'border-[#6B2737]/30 bg-[#6B2737]/5'
            : 'border-[#D7CCC8] bg-white hover:border-[#5C7A4D]/40',
          isActive && 'ring-2 ring-[#D4922A] ring-offset-1'
        )}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm md:text-base font-bold text-[#3E2723]">Mesa {table.number}</span>
          <span className={cn(
            'w-2.5 h-2.5 rounded-full',
            table.is_occupied ? 'bg-[#6B2737]' : 'bg-[#5C7A4D]'
          )} />
        </div>
        <p className="text-xs text-[#8D6E63]">{table.capacity} personas</p>
        {table.is_occupied && table.current_customer_name && (
          <p className="text-xs text-[#3E2723] font-medium truncate mt-1">{table.current_customer_name}</p>
        )}
      </motion.button>

      {/* Popover */}
      {isActive && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[#D7CCC8] shadow-lg p-3" style={{ minWidth: '180px' }}>
          {table.is_occupied && table.current_reservation_id ? (
            <div>
              <p className="text-sm font-medium text-[#3E2723] mb-2">
                {table.current_customer_name || 'Ocupada'}
              </p>
              <p className="text-xs text-[#8D6E63] mb-3">
                {table.current_party_size} personas
                {table.current_time ? ` · ${table.current_time}` : ''}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(table.current_reservation_id!) }}
                className="w-full py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-[0.97] transition-all"
              >
                Liberar mesa
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[#3E2723] mb-2">Asignar reserva</p>
              {unassignedReservations.length === 0 ? (
                <p className="text-xs text-[#8D6E63]">Sin reservas pendientes</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {unassignedReservations.map(r => (
                    <button
                      key={r.id}
                      onClick={(e) => { e.stopPropagation(); onAssign(r.id, table.id) }}
                      className="w-full text-left p-2 rounded-lg bg-[#F5EDE0] hover:bg-[#D7CCC8]/50 text-xs transition-colors"
                    >
                      <span className="font-medium text-[#3E2723]">{r.customers?.full_name || 'Sin nombre'}</span>
                      <span className="text-[#8D6E63] ml-2">{r.party_size}p · {r.time_start?.slice(0, 5)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}