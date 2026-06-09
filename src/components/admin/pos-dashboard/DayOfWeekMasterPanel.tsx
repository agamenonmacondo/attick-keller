'use client'

import { ArrowLeft } from '@phosphor-icons/react'
import type { AggregatedDay } from './POSDailyTrendChart'
import type { POSDashboardData, DrillDownState, DrillDownData } from '@/lib/hooks/usePOSDashboard'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { ZoneRevenueChart } from './ZoneRevenueChart'
import { HourlyRevenueChart } from './HourlyRevenueChart'
import { StaffPerformanceTable } from './StaffPerformanceTable'
import { PaymentMethodsChart } from './PaymentMethodsChart'
import { CategoryDayDetail } from './CategoryDayDetail'
import { DrillDownPanel } from './DrillDownPanel'

interface DayOfWeekMasterPanelProps {
  dayData: AggregatedDay
  data: POSDashboardData
  loading: boolean
  error: string | null
  onBack: () => void
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header ── */}
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
            selectedZone="all"
            onZoneClick={() => {}}
            onZoneDrillDown={onZoneDrillDown}
            unknownZone={data.unknownZone ?? 0}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <HourlyRevenueChart
            data={data.hourlyRevenue ?? []}
            onHourDrillDown={onHourDrillDown}
          />
        </AnimatedCard>
      </div>

      {/* ── Category detail (full width) ── */}
      <AnimatedCard delay={0.09} className="p-4">
        <CategoryDayDetail
          categories={data.topCategories ?? []}
          productsByCategory={data.productsByCategory ?? {}}
          onProductDrillDown={onProductDrillDown}
        />
      </AnimatedCard>

      {/* ── Combinaciones (top 4) ── */}
      <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
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
        <AnimatedCard delay={0.15} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <StaffPerformanceTable
            data={data.staffPerformance ?? []}
            onStaffDrillDown={onStaffDrillDown}
          />
        </AnimatedCard>
        <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
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