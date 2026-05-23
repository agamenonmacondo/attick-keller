'use client'

import { useMemo } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'
import { SectionHeading } from '../shared/SectionHeading'

type HeatmapMetric = 'revenue' | 'propina' | 'cheques' | 'personas'

interface RevenueHeatmapCalendarProps {
  dailyData: Array<{
    date: string
    revenue: number
    cheques: number
    propina: number
    personas: number
  }>
  selectedDate?: string
  onDayClick: (date: string) => void
  metric: HeatmapMetric
  onMetricChange: (metric: HeatmapMetric) => void
}

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  revenue: 'Revenue',
  propina: 'Propinas',
  cheques: 'Cheques',
  personas: 'Personas',
}

const BORGONA_THEME = {
  light: ['#2a2a2a', '#8B5E5E', '#6B2737', '#5A1F2D', '#3D1520'],
  dark: ['#1e1e1e', '#8B5E5E', '#6B2737', '#5A1F2D', '#3D1520'],
}

function formatMetricValue(metric: HeatmapMetric, value: number): string {
  if (metric === 'cheques' || metric === 'personas') return Math.round(value).toString()
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${Math.round(value).toLocaleString('es-CO')}`
}

export function RevenueHeatmapCalendar({
  dailyData,
  selectedDate,
  onDayClick,
  metric,
  onMetricChange,
}: RevenueHeatmapCalendarProps) {
  const activities = useMemo(() => {
    if (dailyData.length === 0) return []

    // Calculate levels based on current metric
    const values = dailyData.map(d => d[metric]).filter(v => v > 0)
    if (values.length === 0) {
      return dailyData.map(d => ({ date: d.date, count: 0, level: 0 }))
    }

    values.sort((a, b) => a - b)
    const q25 = values[Math.floor(values.length * 0.25)]
    const q50 = values[Math.floor(values.length * 0.5)]
    const q75 = values[Math.floor(values.length * 0.75)]

    return dailyData.map(d => {
      const v = d[metric]
      let level = 0
      if (v > 0 && v <= q25) level = 1
      else if (v > q25 && v <= q50) level = 2
      else if (v > q50 && v <= q75) level = 3
      else if (v > q75) level = 4

      return { date: d.date, count: Math.round(v), level }
    })
  }, [dailyData, metric])

  const totalCount = useMemo(() => {
    return dailyData.reduce((sum, d) => sum + d[metric], 0)
  }, [dailyData, metric])

  if (dailyData.length === 0) {
    return (
      <div>
        <SectionHeading>Calendario de operacion</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos para el periodo</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Calendario de operacion</SectionHeading>
        <div className="flex items-center gap-1">
          {(Object.keys(METRIC_LABELS) as HeatmapMetric[]).map(m => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                metric === m
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected date indicator */}
      {selectedDate && (
        <div className="mb-2 text-[11px] text-[var(--color-ak-borgona)] font-medium">
          Dia seleccionado: {selectedDate}
        </div>
      )}

      <div className="overflow-x-auto" onClick={(e) => {
        // ActivityCalendar renders SVG rects with data-date attributes via title
        // We detect clicks on the SVG and find the date from tooltip title
        const target = e.target as SVGElement
        const title = target.getAttribute('title') || target.closest('rect')?.getAttribute('title') || ''
        // Title format from our tooltip: "2026-04-15: Revenue: $22.5M · ..."
        const dateMatch = title.match(/^(\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          onDayClick(dateMatch[1])
        }
      }}>
        <ActivityCalendar
          data={activities}
          theme={BORGONA_THEME}
          colorScheme="dark"
          blockSize={14}
          blockMargin={4}
          blockRadius={3}
          fontSize={11}
          weekStart={1}
          showWeekdayLabels={['mon', 'wed', 'fri']}
          showMonthLabels
          showColorLegend
          showTotalCount={false}
          labels={{
            months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            weekdays: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
            totalCount: `${METRIC_LABELS[metric]}: ${formatMetricValue(metric, totalCount)}`,
            legend: { less: 'Menos', more: 'Mas' },
          }}
          tooltips={{
            activity: {
              text: (activity) => {
                const dayData = dailyData.find(d => d.date === activity.date)
                if (!dayData) return `${activity.date}: sin datos`
                const parts = [
                  `Revenue: ${formatMetricValue('revenue', dayData.revenue)}`,
                  `Cheques: ${dayData.cheques}`,
                  `Propinas: ${formatMetricValue('propina', dayData.propina)}`,
                ]
                if (dayData.personas > 0) parts.push(`Personas: ${Math.round(dayData.personas)}`)
                return parts.join(' · ')
              },
            },
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--text-secondary)]">
          Click en un dia para ver su desempeno
        </span>
        <span className="text-[10px] text-[var(--text-secondary)]">
          Total: {formatMetricValue(metric, totalCount)}
        </span>
      </div>
    </div>
  )
}