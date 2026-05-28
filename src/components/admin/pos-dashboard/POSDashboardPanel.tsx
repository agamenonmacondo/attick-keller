'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { usePOSDashboard, type POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import { usePOSCosts } from '@/lib/hooks/usePOSCosts'
import { usePOSCalendar } from '@/lib/hooks/usePOSCalendar'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner, ChartBar, ChartLine } from '@phosphor-icons/react'
import { POSFiltersBar } from './POSFiltersBar'
import { POSCostPanel } from './POSCostPanel'
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

type DashboardTab = 'operation' | 'costs'

export function POSDashboardPanel() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('operation')
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day')
  const [filters, setFilters] = useState<POSDashboardFilters>(DEFAULT_FILTERS)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue')
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>(undefined) // 'YYYY-MM' for calendar view month

  // ── Cost tab hook ──
  const costsFilters = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    group: filters.category,
  }), [filters.from, filters.to, filters.category])
  const { data: costsData, loading: costsLoading, error: costsError } = usePOSCosts(costsFilters)

  // When in month mode, clear date filters so data covers the full month
  const effectiveFilters = useMemo<POSDashboardFilters>(() => {
    if (viewMode === 'month') {
      return { ...filters, from: undefined, to: undefined }
    }
    return filters
  }, [viewMode, filters])

  const { data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown } = usePOSDashboard(effectiveFilters)
  // Calendar shows ALL days regardless of month filter
  const { dailyTrend: calendarTrend, availableMonths: calendarMonths } = usePOSCalendar(filters.zone)
  const drillDownRef = useRef<HTMLDivElement>(null)

  const isSingleDay = useMemo(() => {
    if (viewMode === 'month') return false
    return filters.from === filters.to && !!filters.from
  }, [viewMode, filters.from, filters.to])

  const handleToggleViewMode = useCallback(() => {
    if (viewMode === 'day') {
      // Switching to month mode — clear date selection
      setFilters(f => ({ ...f, from: undefined, to: undefined }))
      setViewMode('month')
    } else {
      // Back to day mode — server auto-detects latest month
      setViewMode('day')
    }
  }, [viewMode])

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
    // If clicking a date, always switch to day mode
    setViewMode('day')
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
      {/* Header with tab toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('operation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'operation'
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ChartLine size={13} />
              Operacion
            </button>
            <button
              onClick={() => setActiveTab('costs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'costs'
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ChartBar size={13} />
              Costos
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{activeTab === 'costs' ? 'Costos POS' : 'Operacion POS'}</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {viewMode === 'month'
                ? <>Vista consolidada: <span className="font-semibold text-[var(--color-ak-borgona)]">Mes completo</span></>
                : isSingleDay
                  ? <>Vista por dia: <span className="font-semibold text-[var(--color-ak-borgona)]">{filters.from}</span></>
                  : `${filters.from} a ${filters.to}`
              }
              {filters.zone !== 'all' && ` · Zona: ${filters.zone}`}
              {filters.category !== 'all' && ` · Categoria filtrada`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleViewMode}
            className={`text-[10px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
              viewMode === 'month'
                ? 'bg-[var(--color-ak-borgona)] text-white border-[var(--color-ak-borgona)]'
                : 'text-[var(--color-ak-borgona)] border-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10'
            }`}
          >
            Consolidado
          </button>
          {isSingleDay && (
            <button
              onClick={handleBackToPeriod}
              className="text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
            >
              Ver todo el periodo
            </button>
          )}
          <POSFiltersBar
            filters={effectiveFilters}
            onChange={handleFilterChange}
            categoryList={data?.categoryList || []}
            zoneList={zoneListForFilter}
            availableMonths={calendarMonths}
          />
        </div>
      </div>

      {/* Loading overlay */}
      {loading && data && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[var(--color-ak-borgona)] text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium animate-pulse">
          <Spinner size={14} className="animate-spin" />
          Actualizando...
        </div>
      )}

      {/* Full-page spinner when no data yet */}
      {loading && !data && activeTab === 'operation' && (
        <div className="py-16 flex items-center justify-center">
          <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}

      {/* Cost panel */}
      {activeTab === 'costs' && (
        <POSCostPanel
          data={costsData}
          loading={costsLoading}
          error={costsError}
          selectedDate={isSingleDay ? filters.from : undefined}
          onDayClick={handleDayClick}
          calendarMonth={calendarMonth}
          onCalendarMonthChange={setCalendarMonth}
          heatmapMetric={heatmapMetric}
          onHeatmapMetricChange={setHeatmapMetric}
        />
      )}

      {data && activeTab === 'operation' && (
        <>
          {/* CALENDAR — calendar grid with day-by-day navigation */}
          <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <RevenueHeatmapCalendar
              dailyData={calendarTrend}
              selectedDate={isSingleDay ? filters.from : undefined}
              onDayClick={handleDayClick}
              viewMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
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


          {/* Day Performance — cuando un dia seleccionado y NO en modo consolidado */}
          {isSingleDay && viewMode === 'day' && (
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
                totalKpiRevenue={data.kpis.revenue}
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
                totalKpiRevenue={data.kpis.revenue}
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