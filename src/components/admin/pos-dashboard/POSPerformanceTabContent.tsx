'use client'

import { useState, useMemo, useCallback } from 'react'
import { usePOSDashboard } from '@/lib/hooks/usePOSDashboard'
import { usePOSCalendar } from '@/lib/hooks/usePOSCalendar'
import { RevenueHeatmapCalendar } from './RevenueHeatmapCalendar'
import { DayKPIBar } from './DayKPIBar'
import { CapacityComparison } from './CapacityComparison'
import { SectionHeading } from '../shared/SectionHeading'
import { AnimatedCard } from '../shared/AnimatedCard'
import { getDayType, DAY_TYPE_LABELS } from '@/lib/constants/performance'
import { Spinner } from '@phosphor-icons/react'
import type { HeatmapMetric } from './RevenueHeatmapCalendar'

export function POSPerformanceTabContent() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>(undefined)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('cheques')

  const { dailyTrend: calendarTrend } = usePOSCalendar('all')

  const dayFilters = useMemo(() => {
    if (!selectedDate) return { zone: 'all', category: 'all' }
    return { zone: 'all', category: 'all', from: selectedDate, to: selectedDate }
  }, [selectedDate])

  const { data: dayData, loading: dayLoading } = usePOSDashboard(dayFilters)

  // Period averages from the month containing selectedDate
  const monthFilters = useMemo(() => {
    if (!selectedDate) return undefined
    const [y, m] = selectedDate.split('-')
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate()
    return {
      zone: 'all',
      category: 'all',
      from: `${y}-${m}-01`,
      to: `${y}-${m}-${lastDay}`,
    }
  }, [selectedDate])

  const { data: monthData } = usePOSDashboard(monthFilters || { zone: 'all', category: 'all' })

  const periodAverages = useMemo(() => {
    if (!monthData || monthData.dailyTrend.length === 0) return undefined
    const days = monthData.dailyTrend.length
    const totals = monthData.dailyTrend.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        cheques: acc.cheques + d.cheques,
        propinaTotal: acc.propinaTotal + d.propina,
        personas: acc.personas + d.personas,
      }),
      { revenue: 0, cheques: 0, propinaTotal: 0, personas: 0 },
    )
    return {
      revenue: totals.revenue / days,
      cheques: totals.cheques / days,
      ticketPromedio: totals.cheques > 0 ? totals.revenue / totals.cheques : 0,
      propinaTotal: totals.propinaTotal / days,
      propinaPromedio: totals.cheques > 0 ? totals.propinaTotal / totals.cheques : 0,
      personas: totals.personas / days,
      partySizePromedio: totals.cheques > 0 ? totals.personas / totals.cheques : 0,
      cardPaidTotal: monthData.kpis.cardPaidTotal / days,
      cashPaidTotal: monthData.kpis.cashPaidTotal / days,
      avgServiceTime: monthData.kpis.avgServiceTime,
    }
  }, [monthData])

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date)
    setCalendarMonth(date.substring(0, 7))
  }, [])

  const handleCalendarMonthChange = useCallback((month: string) => {
    setCalendarMonth(month)
  }, [])

  const dayType = selectedDate ? getDayType(selectedDate) : null

  return (
    <div className="space-y-5">
      {/* Calendar — always visible */}
      <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <RevenueHeatmapCalendar
          dailyData={calendarTrend}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          viewMonth={calendarMonth}
          onMonthChange={handleCalendarMonthChange}
          metric={heatmapMetric}
          onMetricChange={setHeatmapMetric}
          title="Calendario de rendimiento"
        />
      </AnimatedCard>

      {/* Empty state */}
      {!selectedDate && (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Selecciona un dia en el calendario para ver el rendimiento
          </p>
        </div>
      )}

      {/* Loading state */}
      {selectedDate && dayLoading && (
        <div className="py-12 flex items-center justify-center">
          <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}

      {/* Day data */}
      {selectedDate && dayData && !dayLoading && (
        <>
          {dayType && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-[var(--text-secondary)]">Tipo de dia:</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--color-ak-borgona)]/10">
                {DAY_TYPE_LABELS[dayType]}
              </span>
            </div>
          )}

          <AnimatedCard delay={0.06} className="p-0 overflow-visible">
            <div className="p-4">
              <DayKPIBar
                kpis={dayData.kpis}
                averages={periodAverages}
                isSingleDay={true}
              />
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.12}>
            <CapacityComparison
              hourlyRevenue={dayData.hourlyRevenue}
              selectedDate={selectedDate}
            />
          </AnimatedCard>
        </>
      )}
    </div>
  )
}
