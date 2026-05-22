'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePOSDashboard, type POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Spinner } from '@phosphor-icons/react'
import { POSFiltersBar } from './POSFiltersBar'
import { KPIRow } from './KPIRow'
import { ZoneRevenueChart } from './ZoneRevenueChart'
import { HourlyRevenueChart } from './HourlyRevenueChart'
import { POSDailyTrendChart } from './POSDailyTrendChart'
import { TopProductsTable } from './TopProductsTable'
import { CategoryBreakdown } from './CategoryBreakdown'
import { StaffPerformanceTable } from './StaffPerformanceTable'
import { PaymentMethodsChart } from './PaymentMethodsChart'
import { ClientTiersCard } from './ClientTiersCard'
import { ClientSplitCard } from './ClientSplitCard'
import { TopProductByCategoryChart } from './TopProductByCategoryChart'
import { DayPerformanceCard } from './DayPerformanceCard'
import { DataUploadSection } from './DataUploadSection'

const DEFAULT_FILTERS: POSDashboardFilters = {
  zone: 'all',
  category: 'all',
  from: '2026-04-01',
  to: '2026-04-30',
}

export function POSDashboardPanel() {
  const [filters, setFilters] = useState<POSDashboardFilters>(DEFAULT_FILTERS)
  const { data, loading, error, refetch } = usePOSDashboard(filters)

  const isSingleDay = useMemo(() => {
    return filters.from === filters.to && !!filters.from
  }, [filters.from, filters.to])

  const handleZoneClick = useCallback((zone: string) => {
    setFilters(prev => ({ ...prev, zone }))
  }, [])

  const handleCategoryClick = useCallback((categoryId: string) => {
    setFilters(prev => ({ ...prev, category: categoryId }))
  }, [])

  const handleFilterChange = useCallback((newFilters: POSDashboardFilters) => {
    setFilters(newFilters)
  }, [])

  const handleDayClick = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, from: date, to: date }))
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
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Operacion POS</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {isSingleDay
              ? `${filters.from}`
              : `${filters.from} a ${filters.to}`
            }
            {filters.zone !== 'all' && ` · Zona: ${filters.zone}`}
            {filters.category !== 'all' && ` · Categoria filtrada`}
            {isSingleDay && ` · Vista por dia`}
          </p>
        </div>
        <POSFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          categoryList={data?.categoryList || []}
        />
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="py-16 flex items-center justify-center">
          <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}

      {data && (
        <>
          {/* Day Performance Card - only when single day selected */}
          {isSingleDay && (
            <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
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

          {/* KPIs */}
          <AnimatedCard delay={0} className="p-0 overflow-visible">
            <div className="p-4">
              <KPIRow kpis={data.kpis} />
            </div>
          </AnimatedCard>

          {/* Zone Revenue + Hourly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <ZoneRevenueChart
                data={data.byZone}
                selectedZone={filters.zone}
                onZoneClick={handleZoneClick}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <HourlyRevenueChart data={data.hourlyRevenue} />
            </AnimatedCard>
          </div>

          {/* Daily Trend - only when NOT single day (clickable bars) */}
          {!isSingleDay && (
            <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <POSDailyTrendChart
                data={data.dailyTrend}
                onDayClick={handleDayClick}
              />
            </AnimatedCard>
          )}

          {/* Category + Products + Top by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <CategoryBreakdown
                data={data.topCategories}
                selectedCategory={filters.category}
                onCategoryClick={handleCategoryClick}
              />
            </AnimatedCard>
            <AnimatedCard delay={0.3} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <TopProductsTable data={data.topProducts} />
            </AnimatedCard>
          </div>

          {/* Producto estrella por categoria */}
          <AnimatedCard delay={0.33} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
            <TopProductByCategoryChart data={data.topProductByCategory || []} />
          </AnimatedCard>

          {/* Staff + Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedCard delay={0.36} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <StaffPerformanceTable data={data.staffPerformance} />
            </AnimatedCard>
            <AnimatedCard delay={0.42} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <PaymentMethodsChart data={data.paymentMethods} />
            </AnimatedCard>
          </div>

          {/* Client Tiers + Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedCard delay={0.48} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <ClientTiersCard data={data.clientTiers} />
            </AnimatedCard>
            <AnimatedCard delay={0.54} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
              <ClientSplitCard data={data.clientSplit} />
            </AnimatedCard>
          </div>

          {/* Upload section */}
          <AnimatedCard delay={0.6} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
            <DataUploadSection onUploadComplete={refetch} />
          </AnimatedCard>
        </>
      )}
    </div>
  )
}