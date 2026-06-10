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
  // Selected specific date for filtering results (overrides day-of-week aggregation)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
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
  // If selectedDate is set, filter to that specific day; otherwise show full historical range
  const resultsFilters = useMemo<POSDashboardFilters>(() => ({
    zone: resultsZone,
    category: resultsCategory,
    from: selectedDate || '2026-01-01',
    to: selectedDate || '2026-06-30',
  }), [resultsZone, resultsCategory, selectedDate])
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

  // Unified handler for selecting a specific date (from calendar or trend chart)
  // Filters the Results tab to show only that day's data
  const handleDateSelect = useCallback((date: string) => {
    console.log('[POSDashboard] Date selected:', date)
    setSelectedDate(date)
    setSelectedDayOfWeek(null) // Clear day-of-week aggregation view
    setResultsZone('all')
    setResultsCategory('all')
    setDayDetailZone('all')
    setDayDetailCategory('all')
  }, [])

  // When clicking a day-of-week bar in the trend chart,
  // show day-of-week aggregated averages (all Mondays, all Tuesdays, etc.)
  const handleDayOfWeekClick = useCallback((dayData: AggregatedDay, date?: string) => {
    console.log('[POSDashboard] DayOfWeek click:', dayData.label, 'dayOfWeek:', dayData.dayOfWeek)
    // Always use day-of-week aggregation (averages across all occurrences)
    setSelectedDayOfWeek(dayData)
    setDayDetailZone('all')
    setDayDetailCategory('all')
    // Clear any specific date filter
    setSelectedDate(null)
    setResultsZone('all')
    setResultsCategory('all')
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
    setSelectedDate(null)
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

  // When a specific date is selected, don't pass dayOfWeek (API uses from/to filters)
  // When in day-of-week aggregation mode, pass dayOfWeek for day-specific drill-down
  const getDrillDownDayOfWeek = useCallback(() => {
    return selectedDate ? undefined : selectedDayOfWeek?.dayOfWeek
  }, [selectedDate, selectedDayOfWeek])

  const handleResultsProductDrillDown = useCallback((productId: string, productName: string) => {
    fetchResultsDrillDown('product', productId, productName, getDrillDownDayOfWeek())
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, getDrillDownDayOfWeek])

  const handleResultsStaffDrillDown = useCallback((staffId: string, staffName: string) => {
    fetchResultsDrillDown('staff', staffId, staffName, getDrillDownDayOfWeek())
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, getDrillDownDayOfWeek])

  const handleResultsCategoryDrillDown = useCallback((categoryId: string, categoryName: string) => {
    fetchResultsDrillDown('category', categoryId, categoryName, getDrillDownDayOfWeek())
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, getDrillDownDayOfWeek])

  const handleResultsHourDrillDown = useCallback((hour: string, extra?: { tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }) => {
    const hourNum = parseInt(hour, 10)
    const label = `${hourNum === 0 ? '12' : hourNum <= 12 ? hourNum : hourNum - 12}${hourNum < 12 ? 'am' : 'pm'}`
    fetchResultsDrillDown('hour', hour, label, getDrillDownDayOfWeek())
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, getDrillDownDayOfWeek])

  const handleResultsZoneDrillDown = useCallback((zoneName: string) => {
    fetchResultsDrillDown('zone', zoneName, zoneName, getDrillDownDayOfWeek())
    scrollToResultsDrillDown()
  }, [fetchResultsDrillDown, scrollToResultsDrillDown, getDrillDownDayOfWeek])

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
        <button onClick={refetch} className="mt-3 text-xs text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] hover:underline">
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
          <div className="flex items-center bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('operation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === 'operation'
                  ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
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
                  ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
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
                  ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
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
                  ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
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
                ? selectedDayOfWeek
                  ? <>Promedio: <span className="font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{selectedDayOfWeek.fullLabel}</span> <span className="text-[var(--text-muted)]">(Ene – Jun 2026)</span></>
                  : selectedDate
                    ? <>Filtrado por dia: <span className="font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{selectedDate}</span></>
                    : <>Datos historicos: <span className="font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">Ene – Jun 2026</span></>
                : viewMode === 'month'
                ? <>Vista consolidada: <span className="font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">Mes completo</span></>
                : isSingleDay
                  ? <>Vista por dia: <span className="font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{filters.from}</span></>
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
                ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)]'
                : 'text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] hover:bg-[var(--color-ak-borgona)]/10 dark:hover:bg-[var(--color-ak-borgona-light)]/10'
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
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium animate-pulse">
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
      {activeTab === 'results' && allData && (() => {
        // Determine which data to show: day-of-week averages or consolidated historical
        const displayData = selectedDayOfWeek ? dayDetail : allData
        const isLoading = selectedDayOfWeek ? dayDetailLoading : allLoading
        const isError = selectedDayOfWeek ? dayDetailError : error
        const showBackButton = selectedDayOfWeek

        if (isLoading && !displayData) {
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <button onClick={() => setSelectedDayOfWeek(null)} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--color-ak-borgona)] dark:hover:text-[var(--color-ak-borgona-light)] transition-colors">
                    ← Volver a Resultados
                  </button>
                )}
                <span className="text-sm text-[var(--text-muted)]">
                  {showBackButton ? `Cargando ${selectedDayOfWeek?.fullLabel}...` : 'Cargando datos...'}
                </span>
              </div>
              <div className="h-16 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl animate-pulse" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-24 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl animate-pulse" />
                <div className="h-24 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl animate-pulse" />
                <div className="h-24 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl animate-pulse" />
              </div>
              <div className="h-64 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl animate-pulse" />
            </div>
          )
        }

        if (isError && !displayData) {
          return (
            <div className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 rounded-xl p-6">
              <p className="text-sm text-[var(--color-danger)] text-center">{isError}</p>
              <button onClick={() => setSelectedDayOfWeek(null)} className="mt-3 text-xs text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] hover:underline block mx-auto">
                {showBackButton ? 'Volver a Resultados' : 'Reintentar'}
              </button>
            </div>
          )
        }

        if (!displayData) return null

        // Active filter pills
        const filterPills = (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedDayOfWeek && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white text-sm font-medium">
                Promedio: {selectedDayOfWeek.fullLabel}
                <button onClick={() => setSelectedDayOfWeek(null)} className="hover:underline ml-1">&times;</button>
              </span>
            )}
            {resultsZone !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 dark:bg-[var(--color-ak-borgona-light)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25 dark:border-[var(--color-ak-borgona-light)]/25">
                Zona: {resultsZone}
                <button onClick={() => setResultsZone('all')} className="hover:text-white ml-1">&times;</button>
              </span>
            )}
            {resultsCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 dark:bg-[var(--color-ak-borgona-light)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25 dark:border-[var(--color-ak-borgona-light)]/25">
                {displayData.topCategories?.find(c => c.categoryId === resultsCategory)?.categoryName || resultsCategory}
                <button onClick={() => setResultsCategory('all')} className="hover:text-white ml-1">&times;</button>
              </span>
            )}
            <button onClick={handleResultsClearFilter} className="text-sm text-[var(--text-secondary)] hover:text-[var(--color-ak-dorado)] underline underline-offset-2">
              Limpiar filtros
            </button>
          </div>
        )

        return (
          <>
            {filterPills}

            <AnimatedCard delay={0} className="p-0 overflow-visible">
              <div className="p-4">
                <DayKPIBar kpis={displayData.kpis} averages={undefined} isSingleDay={false} />
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
                  contextLabel={selectedDayOfWeek ? selectedDayOfWeek.fullLabel : 'Resultados'}
                />
              </div>
            )}

            {/* Tendencia Diaria — revenue por dia historico */}
            <AnimatedCard delay={0.03} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <POSDailyTrendChart data={allData.dailyTrend} onDayClick={handleDayOfWeekClick} />
            </AnimatedCard>

            {/* Desglose 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <ZoneRevenueChart
                  data={displayData.byZone}
                  selectedZone={resultsZone}
                  onZoneClick={handleResultsZoneClick}
                  onZoneDrillDown={handleResultsZoneDrillDown}
                  unknownZone={displayData.unknownZone}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <HourlyRevenueChart
                  data={displayData.hourlyRevenue}
                  onHourDrillDown={handleResultsHourDrillDown}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <TopProductsTable
                  data={displayData.topProducts}
                  onProductDrillDown={handleResultsProductDrillDown}
                  selectedCategory={resultsCategory}
                  productsByCategory={displayData.productsByCategory}
                  selectedCategoryName={displayData.topCategories?.find(c => c.categoryId === resultsCategory)?.categoryName}
                />
              </AnimatedCard>
            </div>

            {/* Detalle expandido — 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-3 sm:p-4">
                <CategoryBreakdown
                  data={displayData.topCategories}
                  selectedCategory={resultsCategory}
                  onCategoryClick={handleResultsCategoryClick}
                  onCategoryDrillDown={handleResultsCategoryDrillDown}
                  onProductDrillDown={handleResultsProductDrillDown}
                  productsByCategory={displayData.productsByCategory}
                  totalKpiRevenue={displayData.kpis.revenue}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <TopProductByCategoryChart
                  data={displayData.topProductByCategory || []}
                  onProductDrillDown={handleResultsProductDrillDown}
                  selectedCategory={resultsCategory}
                  onCategoryDrillDown={handleResultsCategoryDrillDown}
                  topPerformersByCategory={displayData.topPerformersByCategory}
                  bottomPerformersByCategory={displayData.bottomPerformersByCategory}
                  totalKpiRevenue={displayData.kpis.revenue}
                />
              </AnimatedCard>
            </div>

            {/* Staff + Pagos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <StaffPerformanceTable
                  data={displayData.staffPerformance}
                  onStaffDrillDown={handleResultsStaffDrillDown}
                />
              </AnimatedCard>
              <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
                <PaymentMethodsChart data={displayData.paymentMethods} />
              </AnimatedCard>
            </div>

            {/* Category Companions */}
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <CategoryCompanionsCard data={displayData.categoryCompanions || []} />
            </AnimatedCard>
          </>
        )
      })()}

      {/* ── Operation panel ── */}
      {data && activeTab === 'operation' && (
        <>
          {/* CALENDAR — calendar grid with day-by-day navigation */}
          <AnimatedCard delay={0} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
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
            <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-5">
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
            <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <ZoneRevenueChart
                data={data.byZone}
                selectedZone={filters.zone}
                onZoneClick={handleZoneClick}
                onZoneDrillDown={handleZoneDrillDown}
                unknownZone={data.unknownZone}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <HourlyRevenueChart
                data={data.hourlyRevenue}
                onHourDrillDown={handleHourDrillDown}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
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
            <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-3 sm:p-4">
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
            <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
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
          <AnimatedCard delay={0.44} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
            <CategoryCompanionsCard data={data.categoryCompanions || []} />
          </AnimatedCard>

          {/* Category Performers — Top 2 / Bottom 2 per category */}
          <AnimatedCard delay={0.45} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
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
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <StaffPerformanceTable
                data={data.staffPerformance}
                onStaffDrillDown={handleStaffDrillDown}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.54} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
              <PaymentMethodsChart data={data.paymentMethods} />
            </AnimatedCard>
          </div>
        </>
      )}
    </div>
  )
}