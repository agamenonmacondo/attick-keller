'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

// Day names in Spanish — ISO order: 1=Monday ... 7=Sunday
const DAY_NAMES: Record<number, { short: string; full: string; jsDay: number }> = {
  1: { short: 'Lun', full: 'Lunes', jsDay: 1 },
  2: { short: 'Mar', full: 'Martes', jsDay: 2 },
  3: { short: 'Mié', full: 'Miércoles', jsDay: 3 },
  4: { short: 'Jue', full: 'Jueves', jsDay: 4 },
  5: { short: 'Vie', full: 'Viernes', jsDay: 5 },
  6: { short: 'Sáb', full: 'Sábado', jsDay: 6 },
  7: { short: 'Dom', full: 'Domingo', jsDay: 0 },
}

// Map JS day (0=Sun, 1=Mon...6=Sat) to ISO day (1=Mon...7=Sun)
function jsDayToIso(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

export interface AggregatedDay {
  dayOfWeek: number      // ISO: 1=Lun, 7=Dom
  label: string          // "Lun", "Mar", etc.
  fullLabel: string      // "Lunes", "Martes", etc.
  totalRevenue: number   // total acumulado
  avgRevenue: number     // promedio por dia
  totalCheques: number
  avgCheques: number
  totalPropina: number
  avgPropina: number
  count: number          // cuantos dias contribuyeron
}

interface DailyTrendChartProps {
  data: Array<{ date: string; revenue: number; cheques: number; propina: number }>
  onDayClick?: (dayData: AggregatedDay, date?: string) => void
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  const day = payload[0].payload as AggregatedDay
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs min-w-[180px]">
      <p className="text-[var(--text-primary)] font-medium mb-1">{day.fullLabel}</p>

      {/* Revenue */}
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-secondary)]">Ventas total:</span>
        <span className="text-[var(--text-primary)] font-medium">{formatCOPDisplay(day.totalRevenue)}</span>
      </div>
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-muted)]">Promedio/dia:</span>
        <span className="text-[var(--text-muted)]">{formatCOPDisplay(day.avgRevenue)}</span>
      </div>

      {/* Cheques */}
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-secondary)]">Cheques total:</span>
        <span className="text-[var(--text-primary)] font-medium">{Math.round(day.totalCheques)}</span>
      </div>
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-muted)]">Promedio/dia:</span>
        <span className="text-[var(--text-muted)]">{Math.round(day.avgCheques)}</span>
      </div>

      {/* Propina */}
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-secondary)]">Propina total:</span>
        <span className="text-[var(--text-primary)] font-medium">{formatCOPDisplay(day.totalPropina)}</span>
      </div>
      <div className="flex justify-between gap-3 mb-0.5">
        <span className="text-[var(--text-muted)]">Promedio/dia:</span>
        <span className="text-[var(--text-muted)]">{formatCOPDisplay(day.avgPropina)}</span>
      </div>

      {/* Count */}
      <p className="text-[var(--text-muted)] mt-1 pt-1 border-t border-[var(--border-default)] text-[10px]">
        {day.count} {day.count === 1 ? 'dia' : 'dias'} {day.fullLabel.toLowerCase()} con datos
      </p>
    </div>
  )
}

// Colors by day type
const BAR_COLORS: Record<number, string> = {
  1: 'var(--color-ak-borgona)', // Lun
  2: 'var(--color-ak-borgona)', // Mar
  3: 'var(--color-ak-borgona)', // Mié
  4: 'var(--color-ak-borgona)', // Jue
  5: 'var(--color-ak-dorado)',  // Vie
  6: 'var(--color-ak-dorado)',  // Sáb
  7: 'var(--color-ak-oliva)',   // Dom
}

export function POSDailyTrendChart({ data, onDayClick }: DailyTrendChartProps) {
  // Aggregate by day of week: total acumulado + promedio
  const chartData = useMemo<AggregatedDay[]>(() => {
    // Initialize ALL 7 days (even if no data for some)
    const buckets: Record<number, { revenue: number; cheques: number; propina: number; count: number }> = {}
    for (let isoDay = 1; isoDay <= 7; isoDay++) {
      buckets[isoDay] = { revenue: 0, cheques: 0, propina: 0, count: 0 }
    }

    // Accumulate totals
    for (const d of data) {
      const dateObj = new Date(d.date + 'T12:00:00')
      const isoDay = jsDayToIso(dateObj.getDay())
      buckets[isoDay].revenue += d.revenue
      buckets[isoDay].cheques += d.cheques
      buckets[isoDay].propina += d.propina
      buckets[isoDay].count += 1
    }

    // Build ordered array Mon-Sun with totals AND averages
    const result: AggregatedDay[] = []
    for (let isoDay = 1; isoDay <= 7; isoDay++) {
      const b = buckets[isoDay]
      const info = DAY_NAMES[isoDay]
      const count = b.count
      result.push({
        dayOfWeek: isoDay,
        label: info.short,
        fullLabel: info.full,
        totalRevenue: Math.round(b.revenue),
        avgRevenue: count > 0 ? Math.round(b.revenue / count) : 0,
        totalCheques: Math.round(b.cheques),
        avgCheques: count > 0 ? Math.round(b.cheques / count) : 0,
        totalPropina: Math.round(b.propina),
        avgPropina: count > 0 ? Math.round(b.propina / count) : 0,
        count,
      })
    }
    return result
  }, [data])

  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Revenue por Dia</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SectionHeading>Revenue por Dia</SectionHeading>
        {onDayClick && (
          <span className="text-[10px] text-[var(--text-muted)]">Click en barra para ver detalle</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={ false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCOPDisplay(v)}
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Total Revenue bar — colored by day type */}
          <Bar
            dataKey="totalRevenue"
            name="Ventas total"
            radius={[4, 4, 0, 0]}
            className="transition-all duration-300 cursor-pointer"
            onClick={(e: any) => {
              if (onDayClick && e?.payload?.dayOfWeek) {
                const day = e.payload as AggregatedDay
                // Find a matching date in source data for this day of week
                const matchingDate = data.find(d => {
                  const dObj = new Date(d.date + 'T12:00:00')
                  return jsDayToIso(dObj.getDay()) === day.dayOfWeek
                })?.date
                onDayClick(day, matchingDate)
              }
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={BAR_COLORS[entry.dayOfWeek] || 'var(--color-ak-borgona)'} />
            ))}
          </Bar>
          {/* Total Propina bar */}
          <Bar
            dataKey="totalPropina"
            name="Propina total"
            fill="var(--color-ak-oliva)"
            radius={[4, 4, 0, 0]}
            className="transition-all duration-300 cursor-pointer"
            onClick={(e: any) => {
              if (onDayClick && e?.payload?.dayOfWeek) {
                const day = e.payload as AggregatedDay
                const matchingDate = data.find(d => {
                  const dObj = new Date(d.date + 'T12:00:00')
                  return jsDayToIso(dObj.getDay()) === day.dayOfWeek
                })?.date
                onDayClick(day, matchingDate)
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-borgona)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Ventas Lun-Jue (total)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-dorado)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Ventas Vie-Sab (total)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-oliva)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Propina (total)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-muted)]">| Tooltip: total y promedio/dia</span>
        </div>
      </div>
    </div>
  )
}