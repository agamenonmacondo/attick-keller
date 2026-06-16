'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface HourlyDataPoint {
  hour: string              // "0".."23" (string from API)
  hourNum: number           // 0..23 (numeric for correct ordering)
  revenue: number
  cheques: number
  tipTotal: number
  cardPaidTotal: number
  cashPaidTotal: number
}

interface HourlyRevenueChartProps {
  data: Array<{
    hour: string
    revenue: number
    cheques: number
    tipTotal: number
    cardPaidTotal: number
    cashPaidTotal: number
  }>
  onHourDrillDown?: (hour: string, extra?: { tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }) => void
}

function formatHour(h: string | number): string {
  const n = typeof h === 'string' ? parseInt(h, 10) : h
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

function CustomTooltip({ active, payload, label, data }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; data?: HourlyDataPoint[] }) {
  if (!active || !payload) return null
  const hour = typeof label === 'string' ? parseInt(label, 10) : label
  const item = data?.find(d => d.hourNum === hour)
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{item ? formatHour(item.hourNum) : (label ? formatHour(label) : '')}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'revenue' ? `Ventas: ${formatCOPDisplay(p.value)}`
          : p.dataKey === 'cheques' ? `${p.value} cheques`
          : p.dataKey === 'tipTotal' ? `Propina: ${formatCOPDisplay(p.value)}`
          : p.dataKey === 'cardPaidTotal' ? `Tarjeta: ${formatCOPDisplay(p.value)}`
          : p.dataKey === 'cashPaidTotal' ? `Efectivo: ${formatCOPDisplay(p.value)}`
          : ''}
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

  // Transform data: add numeric hour for correct Recharts ordering
  const chartData = useMemo((): HourlyDataPoint[] => data.map(d => ({
    ...d,
    hourNum: parseInt(d.hour, 10),
  })), [data])

  return (
    <div className="min-h-[200px]">
      <SectionHeading>Revenue por Hora</SectionHeading>
      <ResponsiveContainer width="100%" height={280} minHeight={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
          <XAxis
            dataKey="hourNum"
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
            className={`transition-all duration-300 ${onHourDrillDown ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={onHourDrillDown ? (_data: unknown, index: number) => {
              const item = chartData[index]
              if (item) onHourDrillDown(item.hour, {
                tipTotal: item.tipTotal,
                cardPaidTotal: item.cardPaidTotal,
                cashPaidTotal: item.cashPaidTotal,
              })
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