'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface DailyTrendChartProps {
  data: Array<{ date: string; revenue: number; cheques: number; propina: number }>
  onDayClick?: (date: string) => void
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { day: 'numeric' })
}

interface TooltipPayload {
  value: number
  name: string
  dataKey: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label || ''}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'revenue' ? `Revenue: ${formatCOPDisplay(p.value)}` :
           p.dataKey === 'propina' ? `Propina: ${formatCOPDisplay(p.value)}` :
           `${p.value} cheques`}
        </p>
      ))}
      <p className="text-[9px] text-[var(--color-ak-borgona)] mt-1">Click para ver dia</p>
    </div>
  )
}

export function POSDailyTrendChart({ data, onDayClick }: DailyTrendChartProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Tendencia Diaria</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SectionHeading>Tendencia Diaria</SectionHeading>
        {onDayClick && (
          <span className="text-[10px] text-[var(--text-secondary)]">Click en barra para ver dia</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={(e: any) => {
            if (onDayClick && e?.activePayload?.[0]?.payload?.date) {
              onDayClick(e.activePayload[0].payload.date)
            }
          }}
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCOPDisplay(v)}
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill="var(--color-ak-borgona)"
            radius={[4, 4, 0, 0]}
            style={{ transition: 'all 300ms ease-out', cursor: 'pointer' }}
          />
          <Bar
            dataKey="propina"
            fill="var(--color-ak-oliva)"
            radius={[4, 4, 0, 0]}
            style={{ transition: 'all 300ms ease-out', cursor: 'pointer' }}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-borgona)]" />
          <span className="text-[10px] text-[var(--text-secondary)]">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-oliva)]" />
          <span className="text-[10px] text-[var(--text-secondary)]">Propina</span>
        </div>
      </div>
    </div>
  )
}