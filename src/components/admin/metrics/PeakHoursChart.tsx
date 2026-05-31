'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatTime } from '@/lib/utils/formatDate'

interface PeakHoursChartProps {
  hours: Array<{ hour: string; count: number }>
  totalCapacity?: number
}

const CAPACITY_LEVELS = [
  { maxPct: 14, label: 'Bajo', color: 'var(--color-ak-oliva)' },
  { maxPct: 38, label: 'Medio', color: 'var(--color-ak-ambar)' },
  { maxPct: 71, label: 'Alto', color: 'var(--color-ak-borgona)' },
  { maxPct: 100, label: 'Pico', color: 'var(--color-ak-borgona)' },
]

function getLevel(pct: number) {
  return CAPACITY_LEVELS.find(l => pct <= l.maxPct) || CAPACITY_LEVELS[CAPACITY_LEVELS.length - 1]
}

export function PeakHoursChart({ hours, totalCapacity }: PeakHoursChartProps) {
  // Scale against total capacity (210 tables × avg seats)
  // For hourly bars: capacity * 2 assumes ~2 seatings per time slot
  const capacity = totalCapacity || 210
  const seatingsPerSlot = 2 // lunch + dinner turnover estimate
  const slotCapacity = capacity * seatingsPerSlot

  const maxCount = Math.max(...hours.map(h => h.count), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SectionHeading>Horas pico (ultimos 30 dias)</SectionHeading>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-ak-oliva)' }} /> Bajo</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-ak-ambar)' }} /> Medio</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-ak-borgona)' }} /> Alto</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-ak-borgona)' }} /> Pico</span>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">Capacidad: {capacity} asientos · ~{slotCapacity} por franja horaria</p>
      <div className="space-y-2 mt-1">
        {hours.map(({ hour, count }) => {
          // Percentage of capacity for this time slot
          const capacityPct = slotCapacity > 0 ? Math.round((count / slotCapacity) * 100) : 0
          // Visual width relative to max for readability
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0
          const level = getLevel(capacityPct)

          return (
            <div key={hour} className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[var(--text-secondary)] w-14 text-right shrink-0">{formatTime(hour)}</span>
              <div className="flex-1 h-5 bg-[var(--bg-input)] rounded overflow-hidden">
                <div className="h-full rounded" style={{
                  width: `${widthPct}%`,
                  backgroundColor: level.color,
                  transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1)',
                }} />
              </div>
              <span className="text-[11px] font-mono text-[var(--text-primary)] w-12 text-right shrink-0">{count} <span className="text-[9px] text-[var(--text-secondary)]">({capacityPct}%)</span></span>
            </div>
          )
        })}
        {hours.length === 0 && <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos suficientes</p>}
      </div>
    </div>
  )
}