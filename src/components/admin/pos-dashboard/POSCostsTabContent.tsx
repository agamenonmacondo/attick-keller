'use client'

import { useMemo } from 'react'
import { usePOSCosts } from '@/lib/hooks/usePOSCosts'
import { POSCostPanel } from './POSCostPanel'
import type { HeatmapMetric } from './RevenueHeatmapCalendar'

interface POSCostsTabContentProps {
  from?: string
  to?: string
  category?: string
  isSingleDay: boolean
  selectedDate?: string
  onDayClick: (date: string) => void
  calendarMonth?: string
  onCalendarMonthChange: (month: string) => void
  heatmapMetric: HeatmapMetric
  onHeatmapMetricChange: (metric: HeatmapMetric) => void
}

export function POSCostsTabContent({
  from,
  to,
  category,
  isSingleDay,
  selectedDate,
  onDayClick,
  calendarMonth,
  onCalendarMonthChange,
  heatmapMetric,
  onHeatmapMetricChange,
}: POSCostsTabContentProps) {
  const costsFilters = useMemo(() => ({
    from,
    to,
    group: category,
  }), [from, to, category])

  const { data: costsData, loading: costsLoading, error: costsError } = usePOSCosts(costsFilters)

  return (
    <POSCostPanel
      data={costsData}
      loading={costsLoading}
      error={costsError}
      selectedDate={isSingleDay ? selectedDate : undefined}
      onDayClick={onDayClick}
      calendarMonth={calendarMonth}
      onCalendarMonthChange={onCalendarMonthChange}
      heatmapMetric={heatmapMetric}
      onHeatmapMetricChange={onHeatmapMetricChange}
    />
  )
}
