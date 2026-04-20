'use client'

import { cn } from '@/lib/utils/cn'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'

interface TableMapProps {
  zones: Array<Record<string, unknown>>
  unassignedTables: Array<Record<string, unknown>>
}

export function TableMap({ zones, unassignedTables }: TableMapProps) {
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
                const customer = table.current_customer_name as string | null
                const time = table.current_time as string | null
                const partySize = table.current_party_size as number | null

                return (
                  <AnimatedCard key={String(table.id)} delay={(zi * 8 + ti) * 0.03}>
                    <div className={cn('rounded-lg border-2 p-3 text-center cursor-default', isOccupied ? 'bg-[#6B2737]/10 border-[#6B2737]/30' : 'bg-white border-[#D7CCC8]')}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className={cn('w-2 h-2 rounded-full', isOccupied ? 'bg-[#6B2737]' : 'bg-emerald-400')} />
                        <span className="text-sm font-mono font-bold text-[#3E2723]">{number}</span>
                      </div>
                      <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
                      {isOccupied && (
                        <div className="mt-1 pt-1 border-t border-[#D7CCC8]/50">
                          <p className="text-[10px] font-medium text-[#3E2723] truncate">{customer}</p>
                          <p className="text-[9px] text-[#8D6E63]">{partySize}p · {time}</p>
                        </div>
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
              return (
                <AnimatedCard key={String(table.id)} delay={ti * 0.03}>
                  <div className={cn('rounded-lg border-2 border-dashed p-3 text-center', isOccupied ? 'bg-[#6B2737]/10 border-[#6B2737]/30' : 'bg-[#EFEBE9] border-[#D7CCC8]')}>
                    <span className="text-sm font-mono font-bold text-[#3E2723]">{number}</span>
                    <p className="text-[10px] text-[#8D6E63]">{capacity}p</p>
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