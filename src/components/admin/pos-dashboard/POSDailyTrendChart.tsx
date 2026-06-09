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

// Get the Monday of the week containing a given date string (YYYY-MM-DD)
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const jsDay = d.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay // 1=Mon...7=Sun
  const diff = isoDay - 1 // days to subtract to get Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Build a date string YYYY-MM-DD from a Date object
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface WeekDay {
  dayOfWeek: number  // ISO: 1=Lun, 7=Dom
  label: string      // "Lun", "Mar", etc.
  fullLabel: string  // "Lunes", "Martes", etc.
  date: string       // actual date of this day in the latest week
  revenue: number    // total revenue for that day
  cheques: number
  propina: number
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
          {p.dataKey === 'revenue' ? `Ventas: ${formatCOPDisplay(p.value)}` :
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
  5: 'var(--color-ak-dorado)',  // Vie
  6: 'var(--color-ak-dorado)',  // Sáb
  7: 'var(--color-ak-oliva)',   // Dom
}

export function POSDailyTrendChart({ data, onDayClick }: DailyTrendChartProps) {
  // Find the last COMPLETE week (Mon-Sun) with enough data
  const chartData = useMemo<WeekDay[]>(() => {
    if (data.length === 0) return []

    // Build a lookup map for quick date access
    const dateMap = new Map<string, { revenue: number; cheques: number; propina: number }>()
    for (const d of data) {
      dateMap.set(d.date, { revenue: d.revenue, cheques: d.cheques, propina: d.propina })
    }

    // Start from the last date in the data and check weeks backwards
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
    const lastDate = sorted[sorted.length - 1].date
    let mondayStr = getMonday(lastDate)

    // Build the candidate week and count non-zero days
    const tryBuildWeek = (monday: string): { days: WeekDay[]; daysWithData: number } => {
      const days: WeekDay[] = []
      let daysWithData = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday + 'T12:00:00')
        d.setDate(d.getDate() + i)
        const dateStr = toDateStr(d)
        const isoDay = i + 1
        const info = DAY_NAMES[isoDay]
        const dayData = dateMap.get(dateStr)
        if (dayData && dayData.revenue > 0) daysWithData++
        days.push({
          dayOfWeek: isoDay,
          label: info.short,
          fullLabel: info.full,
          date: dateStr,
          revenue: dayData?.revenue ?? 0,
          cheques: dayData?.cheques ?? 0,
          propina: dayData?.propina ?? 0,
        })
      }
      return { days, daysWithData }
    }

    // Try current week; if fewer than 4 days with data, go to previous week
    let { days, daysWithData } = tryBuildWeek(mondayStr)
    if (daysWithData < 4) {
      // Go to previous Monday
      const prevMonday = new Date(mondayStr + 'T12:00:00')
      prevMonday.setDate(prevMonday.getDate() - 7)
      mondayStr = toDateStr(prevMonday)
      const prev = tryBuildWeek(mondayStr)
      if (prev.daysWithData > daysWithData) {
        days = prev.days
        daysWithData = prev.daysWithData
      }
    }

    return days
  }, [data])

  // Format the week range for the subtitle
  const weekLabel = useMemo(() => {
    if (chartData.length < 7) return ''
    const first = chartData[0].date
    const last = chartData[6].date
    const fmt = (d: string) => {
      const dt = new Date(d + 'T12:00:00')
      return `${dt.getDate()}/${dt.getMonth() + 1}`
    }
    return `${fmt(first)} - ${fmt(last)}`
  }, [chartData])

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
        <div className="flex items-center gap-2">
          <SectionHeading>Revenue por Dia</SectionHeading>
          {weekLabel && (
            <span className="text-[10px] text-[var(--text-muted)]">{weekLabel}</span>
          )}
        </div>
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
              const day = e.activePayload[0].payload as WeekDay
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
          <span className="text-[10px] text-[var(--text-muted)]">Ventas</span>
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