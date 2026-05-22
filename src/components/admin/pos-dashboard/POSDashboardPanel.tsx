'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePOSDashboard, type POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner } from '@phosphor-icons/react'
import { POSFiltersBar } from './POSFiltersBar'
import { KPIRow } from './KPIRow'
import { RevenueHeatmapCalendar } from './RevenueHeatmapCalendar'
import { DayKPIBar } from './DayKPIBar'
import { ZoneRevenueChart } from './ZoneRevenueChart'
import { HourlyRevenueChart } from './HourlyRevenueChart'
import { TopProductsTable } from './TopProductsTable'
import { CategoryBreakdown } from './CategoryBreakdown'
import { StaffPerformanceTable } from './StaffPerformanceTable'
import { PaymentMethodsChart } from './PaymentMethodsChart'
import { ClientTiersCard } from './ClientTiersCard'
import { ClientSplitCard } from './ClientSplitCard'
import { TopProductByCategoryChart } from './TopProductByCategoryChart'
import { DayPerformanceCard } from './DayPerformanceCard'
import { DataUploadSection } from './DataUploadSection'

type HeatmapMetric = 'revenue' | 'propina' | 'cheques' | 'personas'

const DEFAULT_FILTERS: POSDashboardFilters = {
  zone: 'all',
  category: 'all',
  from: '2026-04-01',
  to: '2026-04-30',
}

export function POSDashboardPanel() {
  const [filters, setFilters] = useState<POSDashboardFilters>(DEFAULT_FILTERS)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue')
  const { data, loading, error, refetch } = usePOSDashboard(filters)

  const isSingleDay = useMemo(() => {
    return filters.from === filters.to && !!filters.from
  }, [filters.from, filters.to])

  // Calculate period averages for day comparison
  const periodAverages = useMemo(() => {
    if (!data || data.dailyTrend.length === 0) return undefined
    const days = data.dailyTrend.length
    const totals = data.dailyTrend.reduce((acc: { revenue: number; cheques: number; propinaTotal: number; personas: number; ticketPromedio: number; propinaPromedio: number; partySizePromedio: number }, d: { revenue: number; cheques: number; propina: number; personas: number }) => ({
      revenue: acc.revenue + d.revenue,
      cheques: acc.cheques + d.cheques,
      propinaTotal: acc.propinaTotal + d.propina,
      personas: acc.personas + d.personas,
      ticketPromedio: 0,
      propinaPromedio: 0,
      partySizePromedio: 0,
    }), { revenue: 0, cheques: 0, propinaTotal: 0, personas: 0, ticketPromedio: 0, propinaPromedio: 0, partySizePromedio: 0 })
    totals.ticketPromedio = totals.cheques > 0 ? totals.revenue / totals.cheques : 0
    totals.propinaPromedio = totals.cheques > 0 ? totals.propinaTotal / totals.cheques : 0
    totals.partySizePromedio = totals.cheques > 0 ? totals.personas / totals.cheques : 0
    return {
      revenue: totals.revenue / days,
      cheques: totals.cheques / days,
      ticketPromedio: totals.ticketPromedio,
      propinaTotal: totals.propinaTotal / days,
      propinaPromedio: totals.propinaPromedio,
      personas: totals.personas / days,
      partySizePromedio: totals.partySizePromedio,
    }
  }, [data])

  const handleDayClick = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, from: date, to: date }))
  }, [])

  const handleBackToPeriod = useCallback(() => {
    setFilters(prev => ({ ...prev, from: '2026-04-01', to: '2026-04-30' }))
  }, [])

  const handleZoneClick = useCallback((zone: string) => {
    setFilters(prev => ({ ...prev, zone }))
  }, [])

  const handleCategoryClick = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, category: categoryId }))
  }, [])

  const handleFilterChange = useCallback((newFilters: POSDashboardFilters) => {
    setFilters(newFilters)
  }, [])

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <button onClick={refetch} className="mt-3 text-xs text-[var(--color-ak-borgona)] hover:underline">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Operacion POS</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {isSingleDay
              ? <>Vista por dia: <span className="font-semibold text-[var(--color-ak-borgona)]">{filters.from}</span></>
              : `${filters.from} a ${filters.to}`
            }
            {filters.zone !== 'all' && ` · Zona: ${filters.zone}`}
            {filters.category !== 'all' && ` · Categoria filtrada`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSingleDay && (
            <button
              onClick={handleBackToPeriod}
              className="text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
            >
              Ver todo el periodo
            </button>
          )}
          <POSFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            categoryList={data?.categoryList || []}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="py-16 flex items-center justify-center">
          <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}

      {data && (
        <>
          {/* HEATMAP CALENDAR — eje central */}
          <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <RevenueHeatmapCalendar
              dailyData={data.dailyTrend}
              selectedDate={isSingleDay ? filters.from : undefined}
              onDayClick={handleDayClick}
              metric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
            />
          </AnimatedCard>

          {/* Day Performance — cuando un dia seleccionado */}
          {isSingleDay && (
            <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <DayPerformanceCard
                date={filters.from!}
                kpis={data.kpis}
                byZone={data.byZone}
                topProducts={data.topProducts}
                hourlyRevenue={data.hourlyRevenue}
                staffPerformance={data.staffPerformance}
              />
            </AnimatedCard>
          )}

          {/* KPIs — con comparacion vs promedio si es dia unico */}
          <AnimatedCard delay={0.12} className="p-0 overflow-visible">
            <div className="p-4">
              <DayKPIBar
                kpis={data.kpis}
                averages={periodAverages}
                isSingleDay={isSingleDay}
              />
            </div>
          </AnimatedCard>

          {/* Desglose 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <ZoneRevenueChart
                data={data.byZone}
                selectedZone={filters.zone}
                onZoneClick={handleZoneClick}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <HourlyRevenueChart data={data.hourlyRevenue} />
            </AnimatedCard>
            <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <TopProductsTable data={data.topProducts.slice(0, 8)} />
            </AnimatedCard>
          </div>

          {/* Detalle expandido — 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <CategoryBreakdown
                data={data.topCategories}
                selectedCategory={filters.category}
                onCategoryClick={handleCategoryClick}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <TopProductByCategoryChart data={data.topProductByCategory || []} />
            </AnimatedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <StaffPerformanceTable data={data.staffPerformance} />
            </AnimatedCard>
            <AnimatedCard delay={0.54} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <PaymentMethodsChart data={data.paymentMethods} />
            </AnimatedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnimatedCard delay={0.60} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <ClientTiersCard data={data.clientTiers} />
            </AnimatedCard>
            <AnimatedCard delay={0.66} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <ClientSplitCard data={data.clientSplit} />
            </AnimatedCard>
          </div>

          {/* Upload */}
          <AnimatedCard delay={0.72} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <DataUploadSection onUploadComplete={refetch} />
          </AnimatedCard>
        </>
      )}
    </div>
  )
}