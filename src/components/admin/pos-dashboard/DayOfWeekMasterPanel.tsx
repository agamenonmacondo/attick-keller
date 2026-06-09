'use client'

import { ArrowLeft, X } from '@phosphor-icons/react'
import type { AggregatedDay } from './POSDailyTrendChart'
import type { POSDashboardData, DrillDownState, DrillDownData } from '@/lib/hooks/usePOSDashboard'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { ZoneRevenueChart } from './ZoneRevenueChart'
import { HourlyRevenueChart } from './HourlyRevenueChart'
import { TopProductsTable } from './TopProductsTable'
import { CategoryBreakdown } from './CategoryBreakdown'
import { TopProductByCategoryChart } from './TopProductByCategoryChart'
import { CategoryCompanionsCard } from './CategoryCompanionsCard'
import { StaffPerformanceTable } from './StaffPerformanceTable'
import { PaymentMethodsChart } from './PaymentMethodsChart'
import { DrillDownPanel } from './DrillDownPanel'

interface DayOfWeekMasterPanelProps {
  dayData: AggregatedDay
  data: POSDashboardData
  loading: boolean
  error: string | null
  onBack: () => void
  selectedZone: string
  selectedCategory: string
  onZoneClick: (zone: string) => void
  onCategoryClick: (categoryId: string) => void
  onClearFilters: () => void
  onProductDrillDown: (id: string, name: string) => void
  onCategoryDrillDown: (id: string, name: string) => void
  onStaffDrillDown: (id: string, name: string) => void
  onZoneDrillDown: (zoneName: string) => void
  onHourDrillDown: (hour: string, extra?: { tipTotal: number; cardPaidTotal: number; cashPaidTotal: number }) => void
  drillDown: DrillDownState | null
  drillDownData: DrillDownData | null
  drillDownLoading: boolean
  drillDownError: string | null
  onCloseDrillDown: () => void
}

function formatCOP(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${Math.round(abs).toLocaleString('es-CO')}`
}

export function DayOfWeekMasterPanel({
  dayData,
  data,
  loading,
  error,
  onBack,
  selectedZone,
  selectedCategory,
  onZoneClick,
  onCategoryClick,
  onClearFilters,
  onProductDrillDown,
  onCategoryDrillDown,
  onStaffDrillDown,
  onZoneDrillDown,
  onHourDrillDown,
  drillDown,
  drillDownData,
  drillDownLoading,
  drillDownError,
  onCloseDrillDown,
}: DayOfWeekMasterPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse" />
        <div className="h-24 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-48 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse" />
          <div className="h-48 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
        <p className="text-xs text-red-400 text-center">{error}</p>
      </div>
    )
  }

  // Filter categoryCompanions to top 4
  const topCompanions = (data.categoryCompanions || []).slice(0, 4)

  const hasActiveFilter = selectedZone !== 'all' || selectedCategory !== 'all'
  const selectedCategoryName = selectedCategory !== 'all'
    ? (data.topCategories || []).find(c => c.categoryId === selectedCategory)?.categoryName || selectedCategory
    : undefined

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header + Filters ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--color-ak-borgona)] transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            Volver a Resultados
          </button>
          <div className="h-4 w-px bg-[var(--border-default)]" />
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">{dayData.fullLabel}</h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              {dayData.count} {dayData.count === 1 ? 'dia' : 'dias'} {dayData.fullLabel.toLowerCase()}
              {data.filters && <> · <span className="text-[var(--color-ak-borgona)]">Ene – Jun 2026</span></>}
            </p>
          </div>
        </div>

        {/* Active filter pill */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedZone !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25">
                Zona: {selectedZone}
                <button onClick={() => onZoneClick('all')} className="hover:text-white ml-1"><X size={12} /></button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-dorado)] text-sm font-medium border border-[var(--color-ak-borgona)]/25">
                {selectedCategoryName || selectedCategory}
                <button onClick={() => onCategoryClick('all')} className="hover:text-white ml-1"><X size={12} /></button>
              </span>
            )}
            <button onClick={onClearFilters} className="text-sm text-[var(--text-secondary)] hover:text-[var(--color-ak-dorado)] underline underline-offset-2">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── KPIs — promedios por dia ── */}
      <AnimatedCard delay={0} className="p-0 overflow-visible">
        <div className="grid grid-cols-3 gap-3 p-4">
          {/* Ventas prom/dia */}
          <div className="bg-[var(--color-ak-borgona)]/10 border border-[var(--color-ak-borgona)]/20 rounded-lg p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Ventas prom/dia</div>
            <div className="text-base font-bold text-[var(--color-ak-borgona)]">{formatCOP(dayData.avgRevenue)}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {formatCOP(dayData.totalRevenue)}</div>
          </div>
          {/* Cheques prom/dia */}
          <div className="bg-[var(--color-ak-dorado)]/10 border border-[var(--color-ak-dorado)]/20 rounded-lg p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Cheques prom/dia</div>
            <div className="text-base font-bold text-[var(--color-ak-dorado)]">{Math.round(dayData.avgCheques)}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {Math.round(dayData.totalCheques)}</div>
          </div>
          {/* Propina prom/dia */}
          <div className="bg-[var(--color-ak-oliva)]/10 border border-[var(--color-ak-oliva)]/20 rounded-lg p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Propina prom/dia</div>
            <div className="text-base font-bold text-[var(--color-ak-oliva)]">{formatCOP(dayData.avgPropina)}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">total: {formatCOP(dayData.totalPropina)}</div>
          </div>
        </div>
      </AnimatedCard>

      {/* ── Zona + Hora (2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <AnimatedCard delay={0.03} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <ZoneRevenueChart
            data={data.byZone ?? []}
            selectedZone={selectedZone}
            onZoneClick={onZoneClick}
            onZoneDrillDown={onZoneDrillDown}
            unknownZone={data.unknownZone}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <HourlyRevenueChart
            data={data.hourlyRevenue ?? []}
            onHourDrillDown={onHourDrillDown}
          />
        </AnimatedCard>
      </div>

      {/* ── Top Products + Categorias (2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <AnimatedCard delay={0.09} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <TopProductsTable
            data={data.topProducts ?? []}
            onProductDrillDown={onProductDrillDown}
            selectedCategory={selectedCategory}
            productsByCategory={data.productsByCategory ?? {}}
            selectedCategoryName={selectedCategoryName}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-3 sm:p-4">
          <CategoryBreakdown
            data={data.topCategories ?? []}
            selectedCategory={selectedCategory}
            onCategoryClick={onCategoryClick}
            onCategoryDrillDown={onCategoryDrillDown}
            onProductDrillDown={onProductDrillDown}
            productsByCategory={data.productsByCategory ?? {}}
            totalKpiRevenue={data.kpis?.revenue ?? 0}
          />
        </AnimatedCard>
      </div>

      {/* ── Top Product by Category ── */}
      <AnimatedCard delay={0.15} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <TopProductByCategoryChart
          data={data.topProductByCategory || []}
          onProductDrillDown={onProductDrillDown}
          selectedCategory={selectedCategory}
          onCategoryDrillDown={onCategoryDrillDown}
          topPerformersByCategory={data.topPerformersByCategory}
          bottomPerformersByCategory={data.bottomPerformersByCategory}
          totalKpiRevenue={data.kpis?.revenue ?? 0}
        />
      </AnimatedCard>

      {/* ── Combinaciones (top 4) ── */}
      <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <SectionHeading>Combinaciones</SectionHeading>
        <p className="text-[10px] text-[var(--text-secondary)] mb-2">Pares de categorias que se piden en el mismo cheque</p>
        {topCompanions.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
        ) : (
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria 1</th>
                  <th className="text-center py-2 px-1 text-[var(--text-secondary)] font-medium">+</th>
                  <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria 2</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Cheques</th>
                </tr>
              </thead>
              <tbody>
                {topCompanions.map(pair => (
                  <tr key={`${pair.cat1Id}-${pair.cat2Id}`} className="border-b border-[var(--border-default)] last:border-0">
                    <td className="py-1.5 pr-3 text-[var(--text-primary)] font-medium">{pair.cat1Name}</td>
                    <td className="py-1.5 px-1 text-center text-[var(--text-secondary)]">+</td>
                    <td className="py-1.5 pr-3 text-[var(--text-primary)]">{pair.cat2Name}</td>
                    <td className="py-1.5 text-right text-[var(--color-ak-borgona)] tabular-nums font-medium">
                      {pair.sharedCheques.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* ── Staff + Pagos (2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <AnimatedCard delay={0.21} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <StaffPerformanceTable
            data={data.staffPerformance ?? []}
            onStaffDrillDown={onStaffDrillDown}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <PaymentMethodsChart data={data.paymentMethods ?? []} />
        </AnimatedCard>
      </div>

      {/* ── Drill-down detail panel ── */}
      {drillDown && (
        <DrillDownPanel
          drillDown={drillDown}
          data={drillDownData}
          loading={drillDownLoading}
          error={drillDownError}
          onClose={onCloseDrillDown}
          contextLabel={dayData.fullLabel}
        />
      )}
    </div>
  )
}