'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { usePOSDashboard, type POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import { usePOSCalendar } from '@/lib/hooks/usePOSCalendar'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner } from '@phosphor-icons/react'
import { POSFiltersBar } from './POSFiltersBar'
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
import { DrillDownPanel } from './DrillDownPanel'
import { CategoryCompanionsCard } from './CategoryCompanionsCard'
import { ShiftReconciliation } from './ShiftReconciliation'
import { CategoryPerformersCard } from './CategoryPerformersCard'

type HeatmapMetric = 'revenue' | 'propina' | 'cheques' | 'personas'

const DEFAULT_FILTERS: POSDashboardFilters = {
  zone: 'all',
  category: 'all',
  // from/to left empty — server auto-detects latest month with data
}

export function POSDashboardPanel() {
  const [filters, setFilters] = useState<POSDashboardFilters>(DEFAULT_FILTERS)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue')
  const { data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown } = usePOSDashboard(filters)
  // Calendar shows ALL days regardless of month filter
  const { dailyTrend: calendarTrend, availableMonths: calendarMonths } = usePOSCalendar(filters.zone)
  const drillDownRef = useRef<HTMLDivElement>(null)

  const isSingleDay = useMemo(() => {
    return filters.from === filters.to && !!filters.from
  }, [filters.from, filters.to])

  // Calculate period averages for day comparison
  const periodAverages = useMemo(() => {
    if (!data || data.dailyTrend.length === 0) return undefined
    const days = data.dailyTrend.length
    const totals = data.dailyTrend.reduce((acc: { revenue: number; cheques: number; propinaTotal: number; personas: number; ticketPromedio: number; propinaPromedio: number; partySizePromedio: number; cardPaidTotal: number; cashPaidTotal: number; avgServiceTime: number }, d: { revenue: number; cheques: number; propina: number; personas: number }) => ({
      revenue: acc.revenue + d.revenue,
      cheques: acc.cheques + d.cheques,
      propinaTotal: acc.propinaTotal + d.propina,
      personas: acc.personas + d.personas,
      ticketPromedio: 0,
      propinaPromedio: 0,
      partySizePromedio: 0,
      cardPaidTotal: 0,
      cashPaidTotal: 0,
      avgServiceTime: 0,
    }), { revenue: 0, cheques: 0, propinaTotal: 0, personas: 0, ticketPromedio: 0, propinaPromedio: 0, partySizePromedio: 0, cardPaidTotal: 0, cashPaidTotal: 0, avgServiceTime: 0 })
    totals.ticketPromedio = totals.cheques > 0 ? totals.revenue / totals.cheques : 0
    totals.propinaPromedio = totals.cheques > 0 ? totals.propinaTotal / totals.cheques : 0
    totals.partySizePromedio = totals.cheques > 0 ? totals.personas / totals.cheques : 0
    totals.cardPaidTotal = data.kpis.cardPaidTotal / days
    totals.cashPaidTotal = data.kpis.cashPaidTotal / days
    totals.avgServiceTime = data.kpis.avgServiceTime
    return {
      revenue: totals.revenue / days,
      cheques: totals.cheques / days,
      ticketPromedio: totals.ticketPromedio,
      propinaTotal: totals.propinaTotal / days,
      propinaPromedio: totals.propinaPromedio,
      personas: totals.personas / days,
      partySizePromedio: totals.partySizePromedio,
      cardPaidTotal: totals.cardPaidTotal,
      cashPaidTotal: totals.cashPaidTotal,
      avgServiceTime: totals.avgServiceTime,
    }
  }, [data])

  const handleDayClick = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, from: date, to: date }))
  }, [])

  const handleBackToPeriod = useCallback(() => {
    // Clear date filters — server auto-detects latest month
    setFilters(prev => ({ ...prev, from: undefined, to: undefined }))
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

  // ── Drill-down handlers ──
  const scrollToDrillDown = useCallback(() => {
    setTimeout(() => {
      drillDownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const handleProductDrillDown = useCallback((productId: string, productName: string) => {
    fetchDrillDown('product', productId, productName)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const handleStaffDrillDown = useCallback((staffId: string, staffName: string) => {
    fetchDrillDown('staff', staffId, staffName)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const handleCategoryDrillDown = useCallback((categoryId: string, categoryName: string) => {
    fetchDrillDown('category', categoryId, categoryName)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const handleHourDrillDown = useCallback((hour: string) => {
    const hourNum = parseInt(hour, 10)
    const label = `${hourNum === 0 ? '12' : hourNum <= 12 ? hourNum : hourNum - 12}${hourNum < 12 ? 'am' : 'pm'}`
    fetchDrillDown('hour', hour, label)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const handleZoneDrillDown = useCallback((zoneName: string) => {
    fetchDrillDown('zone', zoneName, zoneName)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const zoneListForFilter = useMemo(() => {
    if (!data) return undefined
    const zones = data.byZone.map(z => z.zone)
    return [
      { value: 'all', label: 'Todas las zonas' },
      ...zones.map(z => ({ value: z, label: z })),
    ]
  }, [data])

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
    <div className="space-y-5 px-3 sm:px-0">
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
            zoneList={zoneListForFilter}
            availableMonths={calendarMonths}
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
              dailyData={calendarTrend}
              selectedDate={isSingleDay ? filters.from : undefined}
              onDayClick={handleDayClick}
              metric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
            />
          </AnimatedCard>

          {/* Drill-down panel */}
          {drillDown && (
            <div ref={drillDownRef}>
              <DrillDownPanel
                drillDown={drillDown}
                data={drillDownData}
                loading={drillDownLoading}
                error={drillDownError}
                onClose={closeDrillDown}
              />
            </div>
          )}


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
                onProductDrillDown={handleProductDrillDown}
                onStaffDrillDown={handleStaffDrillDown}
                onZoneDrillDown={handleZoneDrillDown}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <ZoneRevenueChart
                data={data.byZone}
                selectedZone={filters.zone}
                onZoneClick={handleZoneClick}
                onZoneDrillDown={handleZoneDrillDown}
                unknownZone={data.unknownZone}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <HourlyRevenueChart
                data={data.hourlyRevenue}
                onHourDrillDown={handleHourDrillDown}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <TopProductsTable
                data={data.topProducts}
                onProductDrillDown={handleProductDrillDown}
                selectedCategory={filters.category}
                productsByCategory={data.productsByCategory}
                selectedCategoryName={data.topCategories?.find(c => c.categoryId === filters.category)?.categoryName}
              />
            </AnimatedCard>
          </div>

          {/* Detalle expandido — 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-3 sm:p-4">
              <CategoryBreakdown
                data={data.topCategories}
                selectedCategory={filters.category}
                onCategoryClick={handleCategoryClick}
                onCategoryDrillDown={handleCategoryDrillDown}
                onProductDrillDown={handleProductDrillDown}
                productsByCategory={data.productsByCategory}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <TopProductByCategoryChart
                data={data.topProductByCategory || []}
                onProductDrillDown={handleProductDrillDown}
                selectedCategory={filters.category}
                onCategoryDrillDown={handleCategoryDrillDown}
                topPerformersByCategory={data.topPerformersByCategory}
                bottomPerformersByCategory={data.bottomPerformersByCategory}
              />
            </AnimatedCard>
          </div>

          {/* Category Companions — new */}
          <AnimatedCard delay={0.44} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <CategoryCompanionsCard data={data.categoryCompanions || []} />
          </AnimatedCard>

          {/* Category Performers — Top 2 / Bottom 2 per category */}
          <AnimatedCard delay={0.45} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <CategoryPerformersCard
              topPerformersByCat={data.topPerformersByCategory || {}}
              bottomPerformersByCat={data.bottomPerformersByCategory || {}}
              categoryNames={Object.fromEntries((data.topCategories || []).map(c => [c.categoryId, c.categoryName]))}
              categoryList={data.categoryList || []}
              selectedCategory={filters.category}
              onCategoryClick={handleCategoryClick}
              onProductDrillDown={handleProductDrillDown}
            />
          </AnimatedCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <StaffPerformanceTable
                data={data.staffPerformance}
                onStaffDrillDown={handleStaffDrillDown}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.54} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <PaymentMethodsChart data={data.paymentMethods} />
            </AnimatedCard>
          </div>

          {/* Shift Reconciliation — new */}
          <AnimatedCard delay={0.56} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <ShiftReconciliation data={data.shifts || []} />
          </AnimatedCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
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