'use client'

import { AnimatedCard } from '../shared/AnimatedCard'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface ZoneBreakdownProps {
  zones: Array<Record<string, unknown>>
}

export function ZoneBreakdown({ zones }: ZoneBreakdownProps) {
  if (!zones || zones.length === 0) {
    return <div className="bg-white rounded-xl border border-[#D7CCC8] p-6 text-center"><p className="text-sm text-[#8D6E63]">Sin zonas configuradas</p></div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {zones.map((zone, i) => {
        const totalTables = (zone.total_tables as number) || 0
        const occupiedTables = (zone.occupied_tables as number) || 0
        const capacity = (zone.capacity as number) || 0
        const occupiedCap = (zone.occupied_capacity as number) || 0
        const pct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0

        return (
          <AnimatedCard key={String(zone.zone_id)} delay={i * 0.06} className="bg-white rounded-xl border border-[#D7CCC8] p-4">
            <p className="text-sm font-semibold text-[#3E2723] mb-1">{String(zone.zone_name)}</p>
            <p className="text-xs text-[#8D6E63] mb-3"><AnimatedCounter value={occupiedTables} /> de <AnimatedCounter value={totalTables} /> mesas</p>
            <div className="h-2 bg-[#D7CCC8]/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${pct}%`,
                backgroundColor: pct > 80 ? '#6B2737' : pct > 50 ? '#D4922A' : '#5C7A4D',
                transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1)',
              }} />
            </div>
            <p className="text-[10px] text-[#8D6E63] mt-2">Capacidad: {occupiedCap}/{capacity} personas</p>
          </AnimatedCard>
        )
      })}
    </div>
  )
}