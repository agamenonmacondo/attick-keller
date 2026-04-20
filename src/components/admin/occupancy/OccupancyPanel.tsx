'use client'

import { useCallback, useMemo } from 'react'
import { useAdminOccupancy } from '@/lib/hooks/useAdminOccupancy'
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard'
import { useDatesWithReservations } from '@/lib/hooks/useDatesWithReservations'
import { ReservationCalendar } from '../reservations/ReservationCalendar'
import { OccupancyGauge } from './OccupancyGauge'
import { ZoneBreakdown } from './ZoneBreakdown'
import { TableMap } from './TableMap'
import { Spinner } from '@phosphor-icons/react'

interface UnassignedReservation {
  id: string
  party_size: number
  time_start: string
  time_end: string
  customer_name: string | null
}

interface OccupancyPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function OccupancyPanel({ selectedDate, onDateChange }: OccupancyPanelProps) {
  const { data: dashData, loading: dashLoading, refetch: dashRefetch } = useAdminDashboard(selectedDate)
  const { data: occData, refetch: occRefetch } = useAdminOccupancy(selectedDate)
  const { dates: datesWithReservations, days: reservationDays } = useDatesWithReservations(selectedDate)

  // Derive unassigned reservations from dashboard data
  const unassignedReservations: UnassignedReservation[] = useMemo(() => {
    if (!dashData?.reservations) return []
    return dashData.reservations
      .filter((r: Record<string, unknown>) => {
        const status = r.status as string
        const tableId = r.table_id as string | null
        return ['confirmed', 'pre_paid', 'pending'].includes(status) && !tableId
      })
      .map((r: Record<string, unknown>) => {
        const customers = r.customers as Record<string, unknown> | null
        return {
          id: r.id as string,
          party_size: r.party_size as number,
          time_start: r.time_start as string,
          time_end: r.time_end as string,
          customer_name: (customers?.full_name as string) || null,
        }
      })
  }, [dashData])

  const handleAssign = useCallback(async (reservationId: string, tableId: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      })
      if (res.ok) {
        dashRefetch()
        occRefetch()
      } else {
        const d = await res.json()
        alert(d.error || 'Error al asignar mesa')
      }
    } catch {
      alert('Error de conexion')
    }
  }, [dashRefetch, occRefetch])

  const handleUnassign = useCallback(async (reservationId: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: null }),
      })
      if (res.ok) {
        dashRefetch()
        occRefetch()
      } else {
        const d = await res.json()
        alert(d.error || 'Error al liberar mesa')
      }
    } catch {
      alert('Error de conexion')
    }
  }, [dashRefetch, occRefetch])

  if (dashLoading && !dashData) {
    return <div className="py-16 flex items-center justify-center"><Spinner size={32} className="animate-spin text-[#8D6E63]" /></div>
  }

  const occupancy = dashData?.occupancy || { totalCapacity: 0, occupiedCapacity: 0, utilizationPercent: 0, capacityPercent: 0, totalTables: 0, occupiedTables: 0, byZone: [] as Array<Record<string, unknown>> }

  return (
    <>
      <ReservationCalendar selectedDate={selectedDate} onDateChange={onDateChange} days={reservationDays} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-1">
          <OccupancyGauge
            percent={occupancy.utilizationPercent}
            capacityPercent={occupancy.capacityPercent}
            occupied={occupancy.occupiedTables}
            total={occupancy.totalTables}
            guestsSeated={occupancy.occupiedCapacity}
            totalCapacity={occupancy.totalCapacity}
          />
        </div>
        <div className="md:col-span-3">
          <ZoneBreakdown zones={occupancy.byZone as Array<Record<string, unknown>>} />
        </div>
      </div>
      {occData && (
        <TableMap
          zones={occData.zones as Array<Record<string, unknown>>}
          unassignedTables={occData.unassignedTables as Array<Record<string, unknown>>}
          unassignedReservations={unassignedReservations}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
        />
      )}
    </>
  )
}