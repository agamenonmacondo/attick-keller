'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatTime } from '@/lib/utils/formatDate'

interface PeakHoursChartProps {
  hours: Array<{ hour: string; count: number }>
}

export function PeakHoursChart({ hours }: PeakHoursChartProps) {
  const maxCount = Math.max(...hours.map(h => h.count), 1)

  return (
    <div>
      <SectionHeading>Horas pico (ultimos 30 dias)</SectionHeading>
      <div className="space-y-2 mt-3">
        {hours.map(({ hour, count }) => {
          const widthPct = (count / maxCount) * 100
          return (
            <div key={hour} className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#8D6E63] w-14 text-right shrink-0">{formatTime(hour)}</span>
              <div className="flex-1 h-5 bg-[#EFEBE9] rounded overflow-hidden">
                <div className="h-full rounded" style={{
                  width: `${widthPct}%`,
                  backgroundColor: widthPct > 70 ? '#6B2737' : widthPct > 40 ? '#D4922A' : '#5C7A4D',
                  transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1)',
                }} />
              </div>
              <span className="text-[11px] font-mono text-[#3E2723] w-6 text-right shrink-0">{count}</span>
            </div>
          )
        })}
        {hours.length === 0 && <p className="text-xs text-[#8D6E63] text-center py-4">Sin datos suficientes</p>}
      </div>
    </div>
  )
}