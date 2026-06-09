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

interface AggregatedDay {
  dayOfWeek: number  // ISO: 1=Lun, 7=Dom
  label: string      // "Lun", "Mar", etc.
  fullLabel: string  // "Lunes", "Martes", etc.
  revenue: number     // average revenue
  cheques: number     // average cheques
  propina: number     // average propina
  count: number       // how many samples (days) contributed
  totalRevenue: number // sum for reference
}

interface DailyTrendChartProps {
  data: Array<{ date: string; revenue: number; cheques: number; propina: number }>
  onDayClick?: (jsDay: number, dayName: string) => void
}

interface TooltipPayload {
  value: number
  name: string
  dataKey: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'revenue' ? `Revenue: ${formatCOPDisplay(p.value)}` :
           p.dataKey === 'propina' ? `Propina: ${formatCOPDisplay(p.value)}` :
           `${p.value} cheques`}
        </p>
      ))}
      <p className="text-[9px] text-[var(--color-ak-dorado)] mt-1">Click para ver en Operacion</p>
    </div>
  )
}

// Colors by day type
const BAR_COLORS: Record<number, string> = {
  1: 'var(--color-ak-borgona)', // Lun
  2: 'var(--color-ak-borgona)', // Mar
  3: 'var(--color-ak-borgona)', // Mié
  4: 'var(--color-ak-borgona)', // Jue
  5: 'var(--color-ak-dorado)',  // Vie — peak
  6: 'var(--color-ak-dorado)',  // Sáb — peak
  7: 'var(--color-ak-oliva)',   // Dom
}

export function POSDailyTrendChart({ data, onDayClick }: DailyTrendChartProps) {
  // Aggregate daily data by day of week
  const chartData = useMemo<AggregatedDay[]>(() => {
    if (data.length === 0) return []

    const buckets: Record<number, { revenue: number; cheques: number; propina: number; count: number; totalRevenue: number }> = {}

    for (const d of data) {
      const dateObj = new Date(d.date + 'T12:00:00')
      const isoDay = jsDayToIso(dateObj.getDay())
      if (!buckets[isoDay]) {
        buckets[isoDay] = { revenue: 0, cheques: 0, propina: 0, count: 0, totalRevenue: 0 }
      }
      buckets[isoDay].revenue += d.revenue
      buckets[isoDay].cheques += d.cheques
      buckets[isoDay].propina += d.propina
      buckets[isoDay].totalRevenue += d.revenue
      buckets[isoDay].count += 1
    }

    // Build ordered array Mon-Sun
    const result: AggregatedDay[] = []
    for (let isoDay = 1; isoDay <= 7; isoDay++) {
      const b = buckets[isoDay]
      if (!b) continue
      const info = DAY_NAMES[isoDay]
      result.push({
        dayOfWeek: isoDay,
        label: info.short,
        fullLabel: info.full,
        revenue: Math.round(b.revenue / b.count),
        cheques: Math.round(b.cheques / b.count),
        propina: Math.round(b.propina / b.count),
        count: b.count,
        totalRevenue: b.totalRevenue,
      })
    }
    return result
  }, [data])

  if (chartData.length === 0) {
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
          <span className="text-[10px] text-[var(--text-muted)]">Click en barra para ver en Operacion</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={(e: any) => {
            if (onDayClick && e?.activePayload?.[0]?.payload?.dayOfWeek) {
              const day = e.activePayload[0].payload as AggregatedDay
              onDayClick(DAY_NAMES[day.dayOfWeek].jsDay, day.fullLabel)
            }
          }}
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
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
            radius={[4, 4, 0, 0]}
            style={{ transition: 'all 300ms ease-out', cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={BAR_COLORS[entry.dayOfWeek] || 'var(--color-ak-borgona)'} />
            ))}
          </Bar>
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
          <span className="text-[10px] text-[var(--text-muted)]">Revenue (promedio)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-dorado)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Vie/Sab</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-oliva)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Propina</span>
        </div>
      </div>
    </div>
  )
}