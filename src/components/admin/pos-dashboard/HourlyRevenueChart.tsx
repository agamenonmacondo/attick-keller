'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface HourlyRevenueChartProps {
  data: Array<{ hour: string; revenue: number; cheques: number }>
  onHourDrillDown?: (hour: string) => void
}

function formatHour(h: string): string {
  const n = parseInt(h, 10)
  if (n === 0) return '12a'
  if (n < 12) return `${n}a`
  if (n === 12) return '12p'
  return `${n - 12}p`
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
      <p className="font-medium text-[var(--text-primary)] mb-1">{label ? formatHour(label) : ''}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'revenue' ? formatCOPDisplay(p.value) : `${p.value} cheques`}
        </p>
      ))}
    </div>
  )
}

export function HourlyRevenueChart({ data, onHourDrillDown }: HourlyRevenueChartProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Revenue por Hora</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Revenue por Hora</SectionHeading>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
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
            style={{ transition: 'all 300ms ease-out', cursor: onHourDrillDown ? 'pointer' : 'default' }}
            onClick={onHourDrillDown ? (_data: unknown, index: number) => {
              const item = data[index]
              if (item) onHourDrillDown(item.hour)
            } : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
      {onHourDrillDown && (
        <p className="text-[9px] text-[var(--text-secondary)] text-center mt-1">Click en barra para ver detalle</p>
      )}
    </div>
  )
}