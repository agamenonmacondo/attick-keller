'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { getLocalDate } from '@/lib/utils/formatDate'

interface DailyTrendChartProps {
  trend: Array<{ date: string; total: number; confirmed: number }>
}

export function DailyTrendChart({ trend }: DailyTrendChartProps) {
  const today = getLocalDate()
  const maxCount = Math.max(...trend.map(d => d.total), 1)

  return (
    <div>
      <SectionHeading>Tendencia diaria (ultimos 14 dias)</SectionHeading>
      <div className="flex items-end gap-1.5 mt-4" style={{ height: 120 }}>
        {trend.map(({ date, total, confirmed }) => {
          const heightPct = (total / maxCount) * 100
          const confirmedPct = total > 0 ? (confirmed / total) * 100 : 0
          const isToday = date === today
          const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric' })

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#3E2723] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10"
                style={{ transition: 'opacity 150ms ease-out' }}>
                {total} reservas ({confirmed} conf.)
              </div>
              <div className="w-full flex flex-col justify-end" style={{ height: 100 }}>
                <div className="w-full rounded-t" style={{
                  height: `${heightPct}%`,
                  backgroundColor: isToday ? '#C9A94E' : '#6B2737',
                  transition: 'height 500ms cubic-bezier(0.23, 1, 0.32, 1)',
                  minHeight: total > 0 ? 4 : 0,
                  position: 'relative',
                }}>
                  {total > 0 && <div className="absolute bottom-0 left-0 right-0 rounded-b" style={{ height: `${confirmedPct}%`, backgroundColor: isToday ? 'rgba(92, 122, 77, 0.5)' : 'rgba(92, 122, 77, 0.3)' }} />}
                </div>
              </div>
              <span className={isToday ? 'text-[10px] font-bold text-[#C9A94E]' : 'text-[9px] text-[#8D6E63]'}>{dayLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#6B2737]" /><span className="text-[10px] text-[#8D6E63]">Total</span></div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#5C7A4D]/30" /><span className="text-[10px] text-[#8D6E63]">Confirmadas</span></div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#C9A94E]" /><span className="text-[10px] text-[#8D6E63]">Hoy</span></div>
      </div>
    </div>
  )
}