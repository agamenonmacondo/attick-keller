'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { usePOSDashboard, type POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import { usePOSCalendar } from '@/lib/hooks/usePOSCalendar'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner, ChartBar, ChartLine, Receipt, Lightning } from '@phosphor-icons/react'
import { POSFiltersBar } from './POSFiltersBar'
import { RevenueHeatmapCalendar } from './RevenueHeatmapCalendar'
import { DayKPIBar } from './DayKPIBar'
import { ZoneRevenueChart } from './ZoneRevenueChart'
import { HourlyRevenueChart } from './HourlyRevenueChart'
import { TopProductsTable } from './TopProductsTable'
import { CategoryBreakdown } from './CategoryBreakdown'
import { StaffPerformanceTable } from './StaffPerformanceTable'
import { PaymentMethodsChart } from './PaymentMethodsChart'
import { TopProductByCategoryChart } from './TopProductByCategoryChart'
import { DayPerformanceCard } from './DayPerformanceCard'
import { DrillDownPanel } from './DrillDownPanel'
import { CategoryCompanionsCard } from './CategoryCompanionsCard'
import { CategoryPerformersCard } from './CategoryPerformersCard'
import { POSCostsTabContent } from './POSCostsTabContent'
import { POSCatalogTabContent } from './POSCatalogTabContent'
import { POSDailyTrendChart } from './POSDailyTrendChart'
import type { AggregatedDay } from './POSDailyTrendChart'
import { DayOfWeekDetailCard } from './DayOfWeekDetailCard'
import { DayOfWeekMasterPanel } from './DayOfWeekMasterPanel'
import { usePOSDayOfWeekDetail } from '@/lib/hooks/usePOSDayOfWeekDetail'

type HeatmapMetric = 'revenue' | 'propina' | 'cheques' | 'personas'

const DEFAULT_FILTERS: POSDashboardFilters = {
  zone: 'all',
  category: 'all',
  // from/to left empty — server auto-detects latest month with data
}

type DashboardTab = 'operation' | 'results' | 'costs' | 'catalog'

export function POSDashboardPanel() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('operation')
  // Default view is 'month' (consolidado) — user only switches to 'day' when clicking a specific date
  const [viewMode, setViewMode] = useState<'day' | 'month'>('month')
  const [filters, setFilters] = useState<POSDashboardFilters>(DEFAULT_FILTERS)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue')
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>(undefined) // 'YYYY-MM' for calendar view month
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<AggregatedDay | null>(null)
  // ── Results filters — separate from operation filters ──
  const [resultsZone, setResultsZone] = useState<string>('all')
  const [resultsCategory, setResultsCategory] = useState<string>('all')
  // ── Day-of-week detail filters — separate from results and operation ──
  const [dayDetailZone, setDayDetailZone] = useState<string>('all')
  const [dayDetailCategory, setDayDetailCategory] = useState<string>('all')

  // When in month mode, derive from/to from calendarMonth so the dashboard
  // data follows the month the user is viewing (not always "latest month").
  // If calendarMonth is undefined (initial state), derive from current date.
  const effectiveFilters = useMemo<POSDashboardFilters>(() => {
    if (viewMode === 'month') {
      const monthStr = calendarMonth || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      })()
      const [yStr, mStr] = monthStr.split('-')
      const y = parseInt(yStr, 10)
      const m = parseInt(mStr, 10) // 1-based
      const lastDay = new Date(y, m, 0).getDate()
      return { ...filters, from: `${monthStr}-01`, to: `${monthStr}-${lastDay}` }
    }
    return filters
  }, [viewMode, filters, calendarMonth])

  // ── Operation hook ──
  const { data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown } = usePOSDashboard(effectiveFilters)

  // ── Results hook — all-time consolidated data, filtered by results zone/category ──
  const resultsFilters = useMemo<POSDashboardFilters>(() => ({
    zone: resultsZone,
    category: resultsCategory,
    from: '2026-01-01',
    to: '2026-06-30',
  }), [resultsZone, resultsCategory])
  const {
    data: allData,
    loading: allLoading,
    drillDown: resultsDrillDown,
    drillDownData: resultsDrillDownData,
    drillDownLoading: resultsDrillDownLoading,
    drillDownError: resultsDrillDownError,
    fetchDrillDown: fetchResultsDrillDown,
    closeDrillDown: closeResultsDrillDown,
  } = usePOSDashboard(resultsFilters)

  // ── Day-of-week detail hook — fetches filtered data when a day is selected ──
  const { data: dayDetail, loading: dayDetailLoading, error: dayDetailError } = usePOSDayOfWeekDetail(
    selectedDayOfWeek?.dayOfWeek ?? null,
    dayDetailZone,
    dayDetailCategory,
    resultsFilters.from,
    resultsFilters.to
  )

  // Calendar shows ALL days regardless of month filter
  const { dailyTrend: calendarTrend, availableMonths: calendarMonths } = usePOSCalendar(filters.zone)

  // ── Refs ──
  const drillDownRef = useRef<HTMLDivElement>(null)
  const resultsDrillDownRef = useRef<HTMLDivElement>(null)

  const isSingleDay = useMemo(() => {
    if (viewMode === 'month') return false
    return filters.from === filters.to && !!filters.from
  }, [viewMode, filters.from, filters.to])

  const handleToggleViewMode = useCallback(() => {
    if (viewMode === 'day') {
      // Switching back to month mode — derive month from selected date or current month
      const monthFromFilter = filters.from ? filters.from.substring(0, 7) : undefined
      const newMonth = monthFromFilter || calendarMonth || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      })()
      setCalendarMonth(newMonth)
      setViewMode('month')
    }
    // If already in month mode, do nothing (button stays active)
  }, [viewMode, filters.from, calendarMonth])

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
    setCalendarMonth(date.substring(0, 7))
  }, [])

  // When clicking a day-of-week bar in the trend chart,
  // show detail panel in results — reset day filters on day change
  const handleDayOfWeekClick = useCallback((dayData: AggregatedDay) => {
    setSelectedDayOfWeek(dayData)
    setDayDetailZone('all')
    setDayDetailCategory('all')
  }, [])

  const handleCalendarMonthChange = useCallback((month: string) => {
    // Navigating months in the calendar always switches to consolidated view
    setCalendarMonth(month)
    setViewMode('month')
  }, [])

  const handleZoneClick = useCallback((zone: string) => {
    setFilters(prev => ({ ...prev, zone }))
  }, [])

  const handleCategoryClick = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, category: categoryId }))
  }, [])

  // ── Results zone/category handlers — filter allData ──
  const handleResultsZoneClick = useCallback((zone: string) => {
    setResultsZone(zone)
  }, [])

  const handleResultsCategoryClick = useCallback((categoryId: string) => {
    setResultsCategory(categoryId)
  }, [])

  const handleResultsClearFilter = useCallback(() => {
    setResultsZone('all')
    setResultsCategory('all')
  }, [])

  // ── Day-of-week detail zone/category handlers ──
  const handleDayDetailZoneClick = useCallback((zone: string) => {
    setDayDetailZone(zone)
  }, [])

  const handleDayDetailCategoryClick = useCallback((categoryId: string) => {
    setDayDetailCategory(categoryId)
  }, [])

  const handleDayDetailClearFilter = useCallback(() => {
    setDayDetailZone('all')
    setDayDetailCategory('all')
  }, [])

  const handleFilterChange = useCallback((newFilters: POSDashboardFilters) => {
    setFilters(newFilters)
  }, [])

  // ── Operation drill-down handlers ──
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

  const handleHourDrillDown = useCallback((hour: string, extra?: { tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }) => {
    const hourNum = parseInt(hour, 10)
    const label = `${hourNum === 0 ? '12' : hourNum <= 12 ? hourNum : hourNum - 12}${hourNum < 12 ? 'am' : 'pm'}`
    fetchDrillDown('hour', hour, label)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  const handleZoneDrillDown = useCallback((zoneName: string) => {
    fetchDrillDown('zone', zoneName, zoneName)
    scrollToDrillDown()
  }, [fetchDrillDown, scrollToDrillDown])

  // ── Results drill-down handlers ──
  const scrollToResultsDrillDown = useCallback(() => {
    setTimeout(() => {
      resultsDrillDownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const handleResultsProductDrillDown = useCallback((productId: string, productName: string) => {
    fetchResultsDrillDown('product', productId, productName, selectedDayOfWeek?.dayOfWeek)
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, selectedDayOfWeek])

  const handleResultsStaffDrillDown = useCallback((staffId: string, staffName: string) => {
    fetchResultsDrillDown('staff', staffId, staffName, selectedDayOfWeek?.dayOfWeek)
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, selectedDayOfWeek])

  const handleResultsCategoryDrillDown = useCallback((categoryId: string, categoryName: string) => {
    fetchResultsDrillDown('category', categoryId, categoryName, selectedDayOfWeek?.dayOfWeek)
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, selectedDayOfWeek])

  const handleResultsHourDrillDown = useCallback((hour: string, extra?: { tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }) => {
    const hourNum = parseInt(hour, 10)
    const label = `${hourNum === 0 ? '12' : hourNum <= 12 ? hourNum : hourNum - 12}${hourNum < 12 ? 'am' : 'pm'}`
    fetchResultsDrillDown('hour', hour, label, selectedDayOfWeek?.dayOfWeek)
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, selectedDayOfWeek])

  const handleResultsZoneDrillDown = useCallback((zoneName: string) => {
    fetchResultsDrillDown('zone', zoneName, zoneName, selectedDayOfWeek?.dayOfWeek)
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, selectedDayOfWeek])

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
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'results'
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Lightning size={13} />
              Resultados
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
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Receipt size={13} />
              Catalogo
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{activeTab === 'costs' ? 'Costos POS' : activeTab === 'catalog' ? 'Catalogo de Costos' : activeTab === 'results' ? 'Resultados Consolidados' : 'Operacion POS'}</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeTab === 'results'
                ? <>Datos historicos: <span className="font-semibold text-[var(--color-ak-borgona)]">Ene – Jun 2026</span></>
                : viewMode === 'month'
                ? <>Vista consolidada: <span className="font-semibold text-[var(--color-ak-borgona)]">Mes completo</span></>
                : isSingleDay
                  ? <>Vista por dia: <span className="font-semibold text-[var(--color-ak-borgona)]">{filters.from}</span></>
                  : filters.from && filters.to
                    ? `${filters.from} — ${filters.to}`
                    : 'Todo el periodo'
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

      {/* Cost panel — lazy-loaded only when tab is active */}
      {activeTab === 'costs' && (
        <POSCostsTabContent
          from={filters.from}
          to={filters.to}
          category={filters.category}
          isSingleDay={isSingleDay}
          selectedDate={filters.from}
          onDayClick={handleDayClick}
          calendarMonth={calendarMonth}
          onCalendarMonthChange={handleCalendarMonthChange}
          heatmapMetric={heatmapMetric}
          onHeatmapMetricChange={setHeatmapMetric}
        />
      )}

      {/* Catalog panel — lazy-loaded only when tab is active */}
      {activeTab === 'catalog' && <POSCatalogTabContent />}

      {/* ── Results panel — all-time consolidated data with drill-down ── */}
      {activeTab === 'results' && allData && (
        <>
          {/* Full-page spinner while day detail is loading */}
          {selectedDayOfWeek && dayDetailLoading && !dayDetail && (
            <div className="py-8 flex items-center justify-center">
              <Spinner size={24} className="animate-spin text-[var(--text-secondary)]" />
            </div>
          )}
          {/* Error state for day-of-week detail */}
          {selectedDayOfWeek && dayDetailError && !dayDetail && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs text-red-400 text-center">{dayDetailError}</p>
              <button onClick={() => setSelectedDayOfWeek(null)} className="mt-2 text-xs text-[var(--color-ak-borgona)] hover:underline block mx-auto">Volver</button>
            </div>
          )}
          {/* When a day-of-week is selected, show the immersive master panel */}
          {(selectedDayOfWeek && dayDetail) ? (
            <DayOfWeekMasterPanel
              dayData={selectedDayOfWeek}
              data={dayDetail}
              loading={dayDetailLoading}
              error={dayDetailError}
              onBack={() => setSelectedDayOfWeek(null)}
              selectedZone={dayDetailZone}
              selectedCategory={dayDetailCategory}
              onZoneClick={handleDayDetailZoneClick}
              onCategoryClick={handleDayDetailCategoryClick}
              onClearFilters={handleDayDetailClearFilter}
              onProductDrillDown={handleResultsProductDrillDown}
              onCategoryDrillDown={handleResultsCategoryDrillDown}
              onStaffDrillDown={handleResultsStaffDrillDown}
              onZoneDrillDown={handleResultsZoneDrillDown}
              onHourDrillDown={handleResultsHourDrillDown}
              drillDown={resultsDrillDown}
              drillDownData={resultsDrillDownData}
              drillDownLoading={resultsDrillDownLoading}
              drillDownError={resultsDrillDownError}
              onCloseDrillDown={closeResultsDrillDown}
            />
          ) : (
          <>
            {/* Active filter pill — clear to see what's filtered */}
            {(resultsZone !== 'all' || resultsCategory !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                {resultsZone !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25">
                    Zona: {resultsZone}
                    <button onClick={() => setResultsZone('all')} className="hover:text-white ml-1">&times;</button>
                  </span>
                )}
                {resultsCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25">
                    {allData.topCategories?.find(c => c.categoryId === resultsCategory)?.categoryName || resultsCategory}
                    <button onClick={() => setResultsCategory('all')} className="hover:text-white ml-1">&times;</button>
                  </span>
                )}
                <button onClick={handleResultsClearFilter} className="text-sm text-[var(--text-secondary)] hover:text-[var(--color-ak-dorado)] underline underline-offset-2">
                  Limpiar filtros
                </button>
              </div>
            )}

            <AnimatedCard delay={0} className="p-0 overflow-visible">
              <div className="p-4">
                <DayKPIBar kpis={allData.kpis} averages={undefined} isSingleDay={false} />
              </div>
            </AnimatedCard>

            {/* Results drill-down panel */}
            {resultsDrillDown && (
              <div ref={resultsDrillDownRef}>
                <DrillDownPanel
                  drillDown={resultsDrillDown}
                  data={resultsDrillDownData}
                  loading={resultsDrillDownLoading}
                  error={resultsDrillDownError}
                  onClose={closeResultsDrillDown}
                  contextLabel="Resultados"
                />
              </div>
            )}

            {/* Tendencia Diaria — revenue por dia historico */}
            <AnimatedCard delay={0.03} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <POSDailyTrendChart data={allData.dailyTrend} onDayClick={handleDayOfWeekClick} />
            </AnimatedCard>

            {/* Desglose 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <ZoneRevenueChart
                  data={allData.byZone}
                  selectedZone={resultsZone}
                  onZoneClick={handleResultsZoneClick}
                  onZoneDrillDown={handleResultsZoneDrillDown}
                  unknownZone={allData.unknownZone}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <HourlyRevenueChart
                  data={allData.hourlyRevenue}
                  onHourDrillDown={handleResultsHourDrillDown}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <TopProductsTable
                  data={allData.topProducts}
                  onProductDrillDown={handleResultsProductDrillDown}
                  selectedCategory={resultsCategory}
                  productsByCategory={allData.productsByCategory}
                  selectedCategoryName={allData.topCategories?.find(c => c.categoryId === resultsCategory)?.categoryName}
                />
              </AnimatedCard>
            </div>

            {/* Detalle expandido — 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-3 sm:p-4">
                <CategoryBreakdown
                  data={allData.topCategories}
                  selectedCategory={resultsCategory}
                  onCategoryClick={handleResultsCategoryClick}
                  onCategoryDrillDown={handleResultsCategoryDrillDown}
                  onProductDrillDown={handleResultsProductDrillDown}
                  productsByCategory={allData.productsByCategory}
                  totalKpiRevenue={allData.kpis.revenue}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <TopProductByCategoryChart
                  data={allData.topProductByCategory || []}
                  onProductDrillDown={handleResultsProductDrillDown}
                  selectedCategory={resultsCategory}
                  onCategoryDrillDown={handleResultsCategoryDrillDown}
                  topPerformersByCategory={allData.topPerformersByCategory}
                  bottomPerformersByCategory={allData.bottomPerformersByCategory}
                  totalKpiRevenue={allData.kpis.revenue}
                />
              </AnimatedCard>
            </div>

            {/* Staff + Pagos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <StaffPerformanceTable
                  data={allData.staffPerformance}
                  onStaffDrillDown={handleResultsStaffDrillDown}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
                <PaymentMethodsChart data={allData.paymentMethods} />
              </AnimatedCard>
            </div>

            {/* Category Companions */}
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
              <CategoryCompanionsCard data={allData.categoryCompanions || []} />
            </AnimatedCard>
          </>
          )}
        </>
      )}

      {/* ── Operation panel ── */}
      {data && activeTab === 'operation' && (
        <>
          {/* CALENDAR — calendar grid with day-by-day navigation */}
          <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
            <RevenueHeatmapCalendar
              dailyData={calendarTrend}
              selectedDate={isSingleDay ? filters.from : undefined}
              onDayClick={handleDayClick}
              viewMonth={calendarMonth}
              onMonthChange={handleCalendarMonthChange}
              metric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
            />
          </AnimatedCard>

          {/* Operation drill-down panel */}
          {drillDown && (
            <div ref={drillDownRef}>
              <DrillDownPanel
                drillDown={drillDown}
                data={drillDownData}
                loading={drillDownLoading}
                error={drillDownError}
                onClose={closeDrillDown}
                contextLabel="Operacion"
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
        </>
      )}
    </div>
  )
}