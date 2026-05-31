'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { AnimatedCard } from '../shared/AnimatedCard'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { RevenueHeatmapCalendar, type HeatmapMetric } from './RevenueHeatmapCalendar'
import { Spinner, Money, TrendUp, ShoppingCart, ChartBar, Warning, Trophy, Truck, Package, CalendarDots } from '@phosphor-icons/react'
import type { POSCostsData } from '@/lib/hooks/usePOSCosts'

// ── COP full format — always rounded, dots for thousands, NO decimals ──
function formatCOPFull(n: number): string {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}$${abs.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`
}

function formatCOPShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

interface POSCostPanelProps {
  data: POSCostsData | null
  loading: boolean
  error: string | null
  // Calendar heatmap props
  selectedDate?: string
  onDayClick?: (date: string) => void
  calendarMonth?: string
  onCalendarMonthChange?: (month: string) => void
  heatmapMetric?: HeatmapMetric
  onHeatmapMetricChange?: (metric: HeatmapMetric) => void
}

// ── Tooltip for charts ──
interface TooltipPayload {
  value: number
  name: string
  dataKey: string
}

function PurchaseTrendTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label || ''}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-secondary)]">
          {p.dataKey === 'total' ? `Compras: ${formatCOPDisplay(p.value)}` : `${p.value} compras`}
        </p>
      ))}
    </div>
  )
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { categoryName: string; total: number } }> }) {
  if (!active || !payload || !payload[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)]">{d.categoryName}</p>
      <p className="text-[var(--text-secondary)]">{formatCOPFull(d.total)}</p>
    </div>
  )
}

// ── Bar colors for category chart ──
const CATEGORY_COLORS = [
  'var(--color-ak-borgona)',
  '#6B7280', '#9CA3AF', '#4B5563', '#D1D5DB',
  '#92400E', '#B45309', '#D97706', '#F59E0B',
  '#065F46', '#047857', '#10B981', '#34D399',
  '#1E3A5F', '#1E40AF', '#3B82F6', '#60A5FA',
  '#7C2D12', '#C2410C', '#EA580C', '#F97316',
]

// ── Cost-specific metric labels for calendar ──
const COST_METRIC_LABELS: Record<HeatmapMetric, string> = {
  revenue: 'Compras',
  propina: 'Propinas',
  cheques: 'Compras #',
  personas: 'Items #',
}

export function POSCostPanel({
  data,
  loading,
  error,
  selectedDate,
  onDayClick,
  calendarMonth,
  onCalendarMonthChange,
  heatmapMetric = 'revenue',
  onHeatmapMetricChange,
}: POSCostPanelProps) {
  // ── Transform dailyPurchases to calendar format ──
  const calendarData = useMemo(() => {
    if (!data) return []
    return data.dailyPurchases.map(d => ({
      date: d.date,
      revenue: d.total,
      cheques: d.count,
      propina: 0,
      personas: 0,
    }))
  }, [data])

  // ── Monthly trend data for chart ──
  const monthlyChartData = useMemo(() => {
    if (!data) return []
    return data.monthlyPurchases.map(m => ({
      ...m,
      label: m.month, // YYYY-MM
    }))
  }, [data])

  // ── Daily trend data (last 60 days max for readability) ──
  const dailyChartData = useMemo(() => {
    if (!data) return []
    return data.dailyPurchases.slice(-60)
  }, [data])

  // ── Category bar chart data ──
  const categoryChartData = useMemo(() => {
    if (!data) return []
    return data.costByCategory.slice(0, 10)
  }, [data])

  // ── Clean category name: strip "LI ", "NO USAR " prefixes ──
  function cleanCategoryName(name: string): string {
    return name.replace(/^(LI |NO USAR )/i, '')
  }

  // ── Low & high margin products from productMargins ──
  const topLowMarginProducts = useMemo(() => {
    if (!data) return []
    return [...data.productMargins]
      .filter(p => p.salePrice > 0)
      .sort((a, b) => a.marginPct - b.marginPct)
      .slice(0, 10)
  }, [data])

  const topHighMarginProducts = useMemo(() => {
    if (!data) return []
    return [...data.productMargins]
      .filter(p => p.salePrice > 0)
      .sort((a, b) => b.marginPct - a.marginPct)
      .slice(0, 10)
  }, [data])

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatedCard delay={0} className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Money size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Total Compras</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
            {formatCOPShort(summary.totalPurchases)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {summary.purchaseCount} compras
          </span>
        </AnimatedCard>

        <AnimatedCard delay={0.05} className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Promedio Mensual</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
            {formatCOPShort(summary.avgMonthlyPurchases)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {summary.cancelledCount} canceladas
          </span>
        </AnimatedCard>

        <AnimatedCard delay={0.10} className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendUp size={16} className="text-green-400" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Margen Promedio</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
            {summary.avgMarginPct.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {summary.productsWithRecipe} de {summary.productsTotal} productos
          </span>
        </AnimatedCard>

        <AnimatedCard delay={0.15} className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Package size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Proveedor Top</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] truncate" title={summary.topSupplier}>
            {summary.topSupplier || '-'}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            Mayor volumen compras
          </span>
        </AnimatedCard>
      </div>

      {/* ── Cost Calendar Heatmap ── */}
      {calendarData && calendarData.length > 0 && (
        <AnimatedCard delay={0.05} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <RevenueHeatmapCalendar
            dailyData={calendarData}
            selectedDate={selectedDate}
            onDayClick={onDayClick || (() => {})}
            viewMonth={calendarMonth}
            onMonthChange={onCalendarMonthChange || (() => {})}
            metric={heatmapMetric}
            onMetricChange={onHeatmapMetricChange || (() => {})}
            title="Calendario de Compras"
            metricLabels={COST_METRIC_LABELS}
          />
        </AnimatedCard>
      )}

      {/* ── Purchase Trend Chart ── */}
      <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <SectionHeading>Tendencia de Compras</SectionHeading>
        {monthlyChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCOPShort(v)}
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<PurchaseTrendTooltip />} />
                <Bar
                  dataKey="total"
                  fill="var(--color-ak-borgona)"
                  radius={[4, 4, 0, 0]}
                  style={{ transition: 'all 300ms ease-out' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-ak-borgona)]" />
                <span className="text-[10px] text-[var(--text-secondary)]">Compras mensuales</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos de compras</p>
        )}
      </AnimatedCard>

      {/* ── Cost by Ingredient Category ── */}
      <AnimatedCard delay={0.22} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <SectionHeading>Costo por Categoria de Ingrediente</SectionHeading>
        {categoryChartData.length > 0 ? (
          <>
            <div className="space-y-2">
              {categoryChartData.map((cat, i) => {
                const maxCost = categoryChartData[0]?.total || 1
                const pct = (cat.total / maxCost) * 100
                return (
                  <div key={cat.categoryId} className="flex items-center gap-3">
                    <div className="w-32 sm:w-44 text-[11px] text-[var(--text-secondary)] truncate" title={cat.categoryName}>
                      {cleanCategoryName(cat.categoryName)}
                    </div>
                    <div className="flex-1 h-6 bg-[var(--bg-card)] border border-[var(--border-default)] rounded overflow-hidden relative">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${pct}%`,
                          background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <div className="w-24 text-right text-[11px] font-medium text-[var(--text-primary)] tabular-nums">
                      {formatCOPShort(cat.total)}
                    </div>
                  </div>
                )
              })}
            </div>
            {data.costByCategory.length > 10 && (
              <p className="text-[10px] text-[var(--text-secondary)] text-center mt-2">
                Mostrando top 10 de {data.costByCategory.length} categorias
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos de categorias</p>
        )}
      </AnimatedCard>

      {/* ── Margin Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Low Margin Products */}
        <AnimatedCard delay={0.26} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Warning size={16} className="text-red-400" />
            <SectionHeading className="mb-0">Menor Margen</SectionHeading>
          </div>
          {topLowMarginProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-1.5 pr-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Producto</th>
                    <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[80px]">Precio Venta</th>
                    <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[80px]">Costo Receta</th>
                    <th className="text-right py-1.5 pl-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[65px]">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {topLowMarginProducts.map((p, i) => (
                    <tr key={i} className="border-b border-[var(--border-default)]/50 last:border-0">
                      <td className="py-1.5 pr-2 text-[var(--text-primary)] max-w-[100px] truncate" title={p.productName}>
                        {p.productName}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-primary)] tabular-nums">
                        {formatCOPFull(p.salePrice)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-secondary)] tabular-nums">
                        {formatCOPFull(Math.round(p.recipeCost))}
                      </td>
                      <td className={`py-1.5 pl-2 text-right font-medium tabular-nums min-w-[55px] ${p.marginPct < 30 ? 'text-red-400' : p.marginPct < 50 ? 'text-yellow-400' : 'text-[var(--text-primary)]'}`}>
                        {p.marginPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] text-center py-6">Sin datos de margenes</p>
          )}
        </AnimatedCard>

        {/* High Margin Products */}
        <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Trophy size={16} className="text-green-400" />
            <SectionHeading className="mb-0">Mayor Margen</SectionHeading>
          </div>
          {topHighMarginProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-1.5 pr-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Producto</th>
                    <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[80px]">Precio Venta</th>
                    <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[80px]">Costo Receta</th>
                    <th className="text-right py-1.5 pl-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium min-w-[65px]">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {topHighMarginProducts.map((p, i) => (
                    <tr key={i} className="border-b border-[var(--border-default)]/50 last:border-0">
                      <td className="py-1.5 pr-2 text-[var(--text-primary)] max-w-[100px] truncate" title={p.productName}>
                        {p.productName}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-primary)] tabular-nums">
                        {formatCOPFull(p.salePrice)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-secondary)] tabular-nums">
                        {formatCOPFull(Math.round(p.recipeCost))}
                      </td>
                      <td className={`py-1.5 pl-2 text-right font-medium tabular-nums min-w-[55px] ${p.marginPct >= 70 ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                        {p.marginPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] text-center py-6">Sin datos de margenes</p>
          )}
        </AnimatedCard>
      </div>

      {/* ── Purchases by Supplier ── */}
      <AnimatedCard delay={0.34} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Truck size={16} className="text-[var(--color-ak-borgona)]" />
          <SectionHeading className="mb-0">Compras por Proveedor</SectionHeading>
        </div>
        {data.purchasesBySupplier.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-1.5 pr-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Proveedor</th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Total</th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">Compras</th>
                  <th className="text-right py-1.5 pl-2 text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">% del Total</th>
                </tr>
              </thead>
              <tbody>
                {data.purchasesBySupplier.map((s, i) => {
                  const pct = summary.totalPurchases > 0 ? (s.total / summary.totalPurchases) * 100 : 0
                  return (
                    <tr key={i} className="border-b border-[var(--border-default)]/50 last:border-0">
                      <td className="py-1.5 pr-2 text-[var(--text-primary)] max-w-[180px] truncate" title={s.supplierName}>
                        {s.supplierName}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-primary)] tabular-nums font-medium">
                        {formatCOPFull(s.total)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[var(--text-secondary)] tabular-nums">
                        {s.count}
                      </td>
                      <td className="py-1.5 pl-2 text-right text-[var(--text-secondary)] tabular-nums">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] text-center py-6">Sin datos de proveedores</p>
        )}
      </AnimatedCard>

      {/* ── Daily Purchase Trend (if data span is short enough) ── */}
      {dailyChartData.length > 0 && dailyChartData.length <= 60 && (
        <AnimatedCard delay={0.38} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <SectionHeading>Compras Diarias</SectionHeading>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dailyChartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(dailyChartData.length / 8))}
              />
              <YAxis
                tickFormatter={(v: number) => formatCOPShort(v)}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip content={<PurchaseTrendTooltip />} />
              <Bar
                dataKey="total"
                fill="var(--color-ak-borgona)"
                radius={[3, 3, 0, 0]}
                style={{ transition: 'all 300ms ease-out' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedCard>
      )}
    </div>
  )
}