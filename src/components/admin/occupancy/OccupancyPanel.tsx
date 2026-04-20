'use client'

import { useAdminOccupancy } from '@/lib/hooks/useAdminOccupancy'
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard'
import { DateNavigator } from '../reservations/DateNavigator'
import { OccupancyGauge } from './OccupancyGauge'
import { ZoneBreakdown } from './ZoneBreakdown'
import { TableMap } from './TableMap'
import { Spinner } from '@phosphor-icons/react'

interface OccupancyPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function OccupancyPanel({ selectedDate, onDateChange }: OccupancyPanelProps) {
  const { data: dashData, loading: dashLoading } = useAdminDashboard(selectedDate)
  const { data: occData } = useAdminOccupancy(selectedDate)

  if (dashLoading && !dashData) {
    return <div className="py-16 flex items-center justify-center"><Spinner size={32} className="animate-spin text-[#8D6E63]" /></div>
  }

  const occupancy = dashData?.occupancy || { totalCapacity: 0, occupiedCapacity: 0, utilizationPercent: 0, totalTables: 0, occupiedTables: 0, byZone: [] }

  return (
    <>
      <DateNavigator selectedDate={selectedDate} onDateChange={onDateChange} datesWithReservations={[]} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-1">
          <OccupancyGauge percent={occupancy.utilizationPercent} occupied={occupancy.occupiedTables} total={occupancy.totalTables} />
        </div>
        <div className="md:col-span-3">
          <ZoneBreakdown zones={occupancy.byZone as Array<Record<string, unknown>>} />
        </div>
      </div>
      {occData && <TableMap zones={occData.zones as Array<Record<string, unknown>>} unassignedTables={occData.unassignedTables as Array<Record<string, unknown>>} />}
    </>
  )
}