'use client'

import { useMemo } from 'react'
import { CaretLeft, CaretRight, CalendarDots } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { useTheme } from '@/lib/ThemeProvider'
import { SectionHeading } from '../shared/SectionHeading'

export type HeatmapMetric = 'revenue' | 'propina' | 'cheques' | 'personas'

interface OperationCalendarProps {
  dailyData: Array<{
    date: string
    revenue: number
    cheques: number
    propina: number
    personas: number
  }>
  selectedDate?: string
  onDayClick: (date: string) => void
  viewMonth?: string // 'YYYY-MM' format, controls which month is displayed
  onMonthChange?: (month: string) => void // called when user navigates months
  metric: HeatmapMetric
  onMetricChange: (metric: HeatmapMetric) => void
  title?: string // Override heading text (default: 'Calendario de operacion')
  metricLabels?: Record<HeatmapMetric, string> // Override metric button labels
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  revenue: 'Revenue',
  propina: 'Propinas',
  cheques: 'Cheques',
  personas: 'Personas',
}

function formatCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function formatMetricValue(metric: HeatmapMetric, value: number): string {
  if (metric === 'cheques' || metric === 'personas') return Math.round(value).toLocaleString('es-CO')
  return formatCOP(value)
}

function getHeatLevel(metric: HeatmapMetric, value: number, thresholds: { q25: number; q50: number; q75: number }): number {
  if (value <= 0) return 0
  if (value <= thresholds.q25) return 1
  if (value <= thresholds.q50) return 2
  if (value <= thresholds.q75) return 3
  return 4
}

const HEAT_COLORS = {
  dark: [
    'bg-[var(--bg-card)]/[0.08]',
    'bg-[var(--color-ak-borgona)]/30',
    'bg-[var(--color-ak-borgona)]/50',
    'bg-[var(--color-ak-borgona)]/70',
    'bg-[var(--color-ak-borgona)]',
  ],
  light: [
    'bg-[var(--bg-input)]',
    'bg-[var(--color-ak-borgona)]/15',
    'bg-[var(--color-ak-borgona)]/30',
    'bg-[var(--color-ak-borgona)]/50',
    'bg-[var(--color-ak-borgona)]/70',
  ],
}

const HEAT_TEXT = {
  dark: ['text-[var(--text-secondary)]', 'text-white', 'text-white', 'text-white', 'text-white'],
  light: ['text-[var(--text-secondary)]', 'text-white', 'text-white', 'text-white', 'text-white'],
}

// Helper: pad month number to 2 digits
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Helper: format Date as YYYY-MM-DD
function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function RevenueHeatmapCalendar({
  dailyData,
  selectedDate,
  onDayClick,
  viewMonth,
  onMonthChange,
  metric,
  onMetricChange,
  title,
  metricLabels,
}: OperationCalendarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Determine which month to show
  const effectiveMonth = viewMonth || (selectedDate ? selectedDate.substring(0, 7) : `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`)
  const vy = parseInt(effectiveMonth.substring(0, 4), 10)
  const vm = parseInt(effectiveMonth.substring(5, 7), 10) - 1 // 0-based month index

  // Build lookup map for daily data
  const dataMap = useMemo(() => {
    const m = new Map<string, { revenue: number; cheques: number; propina: number; personas: number }>()
    for (const d of dailyData) {
      m.set(d.date, { revenue: d.revenue, cheques: d.cheques, propina: d.propina, personas: d.personas })
    }
    return m
  }, [dailyData])

  // Thresholds for heatmap coloring — only for the displayed month's data
  const thresholds = useMemo(() => {
    const monthPrefix = `${vy}-${pad2(vm + 1)}`
    const values = dailyData
      .filter(d => d.date.startsWith(monthPrefix) && d[metric] > 0)
      .map(d => d[metric])
      .sort((a, b) => a - b)
    if (values.length === 0) return { q25: 0, q50: 0, q75: 0 }
    return {
      q25: values[Math.floor(values.length * 0.25)],
      q50: values[Math.floor(values.length * 0.5)],
      q75: values[Math.floor(values.length * 0.75)],
    }
  }, [dailyData, metric, vy, vm])

  // Build calendar grid — CORRECTED: proper day-of-week alignment
  const calendarDays = useMemo(() => {
    // First day of the month
    const firstOfMonth = new Date(vy, vm, 1)
    // getDay() returns 0=Sun, 1=Mon... 6=Sat. We want Mon=0.
    // Convert: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    let startDow = firstOfMonth.getDay() - 1
    if (startDow < 0) startDow = 6 // Sunday wraps to 6

    const daysInMonth = new Date(vy, vm + 1, 0).getDate()

    // Previous month's last days for padding
    const prevMonth = vm === 0 ? 11 : vm - 1
    const prevYear = vm === 0 ? vy - 1 : vy
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()

    const cells: Array<{ date: string; day: number; inMonth: boolean }> = []

    // Fill padding from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      cells.push({ date: fmtDate(prevYear, prevMonth + 1, d), day: d, inMonth: false })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: fmtDate(vy, vm + 1, d), day: d, inMonth: true })
    }

    // Next month padding to fill 6 rows (42 cells) or at least complete the last row
    const nextMonth = vm === 11 ? 0 : vm + 1
    const nextYear = vm === 11 ? vy + 1 : vy
    const remaining = (Math.ceil(cells.length / 7) * 7) - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: fmtDate(nextYear, nextMonth + 1, d), day: d, inMonth: false })
    }

    return cells
  }, [vy, vm])

  const today = useMemo(() => {
    const d = new Date()
    return fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }, [])

  const handlePrevMonth = () => {
    const d = new Date(vy, vm - 1, 1)
    const monthStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
    onMonthChange?.(monthStr)
    // Only navigate calendar visually, don't change date filter
  }

  const handleNextMonth = () => {
    const d = new Date(vy, vm + 1, 1)
    const monthStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
    onMonthChange?.(monthStr)
  }

  const handleToday = () => {
    onMonthChange?.(today.substring(0, 7))
  }

  // Month totals for summary
  const monthData = useMemo(() => {
    const monthPrefix = `${vy}-${pad2(vm + 1)}`
    const md = dailyData.filter(d => d.date.startsWith(monthPrefix))
    return {
      revenue: md.reduce((s, d) => s + d.revenue, 0),
      propina: md.reduce((s, d) => s + d.propina, 0),
      cheques: md.reduce((s, d) => s + d.cheques, 0),
      personas: md.reduce((s, d) => s + d.personas, 0),
      days: md.length,
      avgRevenue: md.length > 0 ? md.reduce((s, d) => s + d.revenue, 0) / md.length : 0,
      avgCheques: md.length > 0 ? md.reduce((s, d) => s + d.cheques, 0) / md.length : 0,
    }
  }, [dailyData, vy, vm])

  if (dailyData.length === 0) {
    return (
      <div>
        <SectionHeading>{title || 'Calendario de operacion'}</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos para el periodo</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header: title + metric selector */}
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>{title || 'Calendario de operacion'}</SectionHeading>
        <div className="flex items-center gap-1">
          {(Object.keys(metricLabels || METRIC_LABELS) as HeatmapMetric[]).map(m => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                metric === m
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {(metricLabels || METRIC_LABELS)[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
          aria-label="Mes anterior"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-3">
          <span className="font-['Playfair_Display'] text-base font-semibold text-[var(--text-primary)]">
            {MONTH_NAMES[vm]} {vy}
          </span>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg px-2.5 py-1 text-[10px] font-medium border border-[var(--color-ak-borgona)]/30 text-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10 active:scale-[0.97]"
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 active:scale-[0.97]"
          aria-label="Mes siguiente"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--text-secondary)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, i) => {
          const dayData = dataMap.get(cell.date)
          const value = dayData ? dayData[metric] : 0
          const level = cell.inMonth ? getHeatLevel(metric, value, thresholds) : 0
          const isSelected = cell.date === selectedDate
          const isToday = cell.date === today
          const isWeekend = i % 7 === 5 || i % 7 === 6

          const bgClass = HEAT_COLORS[isDark ? 'dark' : 'light'][level]
          const textClass = HEAT_TEXT[isDark ? 'dark' : 'light'][level]

          const tooltip = dayData
            ? `${cell.date}: ${formatCOP(dayData.revenue)} · ${dayData.cheques} cheques · ${formatCOP(dayData.propina)} prop`
            : cell.inMonth ? `${cell.date}: sin datos` : ''

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onDayClick(cell.date)}
              className={cn(
                'relative z-10 rounded-lg py-1.5 text-center text-xs font-medium cursor-pointer active:scale-[0.95]',
                bgClass,
                textClass,
                !cell.inMonth && 'opacity-30',
                isSelected && 'ring-2 ring-[var(--color-ak-borgona)] ring-offset-1 ring-offset-[var(--bg-card)]',
                isWeekend && cell.inMonth && 'font-semibold',
              )}
              style={{ transition: 'transform 120ms ease-out' }}
              title={tooltip}
            >
              {cell.day}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--color-ak-borgona)]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {(isDark ? HEAT_COLORS.dark : HEAT_COLORS.light).map((cls, i) => {
            const labels = ['Sin datos', 'Bajo', 'Medio', 'Alto', 'Muy alto']
            return (
              <div key={i} className="flex items-center gap-0.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
                <span className="text-[9px] text-[var(--text-secondary)]">{labels[i]}</span>
              </div>
            )
          })}
        </div>
        <span className="text-[10px] text-[var(--text-secondary)]">
          Total: {formatCOP(monthData.revenue)}
        </span>
      </div>

      {selectedDate && (
        <div className="mt-2 text-[11px] text-[var(--color-ak-borgona)] font-medium">
          Dia seleccionado: {selectedDate}
        </div>
      )}
    </div>
  )
}