'use client'

import { SectionHeading } from '../shared/SectionHeading'

interface TopProductByCategory {
  categoryId: string
  categoryName: string
  productId: string
  productName: string
  quantity: number
  revenue: number
}

interface PerformerProduct {
  productId: string
  productName: string
  quantity: number
  revenue: number
  cheques: number
}

interface TopProductByCategoryChartProps {
  data: TopProductByCategory[]
  onProductDrillDown?: (productId: string, productName: string) => void
  selectedCategory?: string
  onCategoryDrillDown?: (categoryId: string, categoryName: string) => void
  topPerformersByCategory?: Record<string, Array<PerformerProduct>>
  bottomPerformersByCategory?: Record<string, Array<PerformerProduct>>
}

const PALETTE = ['#6B2737', '#5C7A4D', '#D4922A', '#C9A94E', '#3E2723', '#8B5E3C', '#2C5530', '#7B3F00']

function formatCOP(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `$${abs.toLocaleString('es-CO')}`
}

export function TopProductByCategoryChart({
  data,
  onProductDrillDown,
  selectedCategory,
  onCategoryDrillDown,
  topPerformersByCategory,
  bottomPerformersByCategory,
}: TopProductByCategoryChartProps) {
  if (!data || data.length === 0) return null

  const isFiltered = selectedCategory && selectedCategory !== 'all'
  const filteredData = isFiltered
    ? data.filter(d => d.categoryId === selectedCategory)
    : data

  const chartData = filteredData.slice(0, 12).map(d => ({
    ...d,
    label: `${d.productName}`,
    shortCat: d.categoryName.length > 14 ? d.categoryName.slice(0, 12) + '..' : d.categoryName,
  }))

  if (chartData.length === 0) {
    return (
      <div>
        <SectionHeading>Producto estrella por categoria</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos para esta categoria</p>
      </div>
    )
  }

  // When filtered, also show top 2 and bottom 2 performers for that category
  const selectedTopPerformers = isFiltered && topPerformersByCategory ? (topPerformersByCategory[selectedCategory!] || []) : []
  const selectedBottomPerformers = isFiltered && bottomPerformersByCategory ? (bottomPerformersByCategory[selectedCategory!] || []) : []

  const heading = isFiltered
    ? `Producto estrella`
    : 'Producto estrella por categoria'

  return (
    <div>
      <SectionHeading>{heading}</SectionHeading>
      {!isFiltered && (
        <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-4">
          El producto mas vendido en cada linea
        </p>
      )}

      <div className="space-y-3">
        {chartData.map((item, i) => {
          const maxRevenue = chartData[0].revenue
          const widthPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
          const color = PALETTE[i % PALETTE.length]

          return (
            <div
              key={item.categoryId}
              className={`group ${onProductDrillDown ? 'cursor-pointer' : ''}`}
              onClick={onProductDrillDown ? () => onProductDrillDown(item.productId, item.productName) : undefined}
              title={onProductDrillDown ? 'Ver detalle del producto' : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider shrink-0"
                  style={{ color }}
                >
                  {item.categoryName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-7 rounded-md transition-all duration-300 flex items-center px-2.5 min-w-[80px]"
                  style={{
                    width: `${Math.max(widthPct, 15)}%`,
                    backgroundColor: color + '18',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span className="text-[10px] sm:text-xs text-[var(--text-primary)] font-medium truncate">
                    <span className="font-bold" style={{ color }}>#{i + 1}</span> {item.productName}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] sm:text-xs">
                  <span className="text-[var(--text-secondary)]">
                    {Math.round(Number(item.quantity))} uds
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatCOP(item.revenue)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* When a category is filtered, show top 2 and bottom 2 */}
      {isFiltered && selectedTopPerformers.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#5C7A4D] mb-2">
            Top 2 — Mejores
          </p>
          <div className="space-y-1.5">
            {selectedTopPerformers.map((p, i) => (
              <div
                key={`top-${p.productId}`}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-sm ${onProductDrillDown ? 'cursor-pointer hover:bg-[#5C7A4D10]' : ''}`}
                onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                title={onProductDrillDown ? `Ver detalle: ${p.productName}` : undefined}
              >
                <span className="text-[10px] sm:text-xs font-bold text-[#5C7A4D] shrink-0">#{i + 1}</span>
                <span className="text-[10px] sm:text-xs text-[var(--text-primary)] truncate flex-1">{p.productName}</span>
                <span className="text-[10px] sm:text-xs font-mono tabular-nums text-[var(--text-primary)] shrink-0">{formatCOP(p.revenue)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] shrink-0 hidden sm:inline">{p.quantity} uds</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom performers (worst) */}
      {isFiltered && selectedBottomPerformers.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#6B2737] mb-2">
            Bottom 2 — Peor producto
          </p>
          <div className="space-y-1.5">
            {selectedBottomPerformers.map((p, i) => (
              <div
                key={`bottom-${p.productId}`}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-sm opacity-75 ${onProductDrillDown ? 'cursor-pointer hover:bg-[#6B273710]' : ''}`}
                onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                title={onProductDrillDown ? `Ver detalle: ${p.productName}` : undefined}
              >
                <span className="text-[10px] sm:text-xs font-bold text-[#6B2737] shrink-0">
                  #{selectedTopPerformers.length > 0 ? selectedTopPerformers.length + i + 1 : i + 1}
                </span>
                <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] truncate flex-1">{p.productName}</span>
                <span className="text-[10px] sm:text-xs font-mono tabular-nums text-[var(--text-secondary)] shrink-0">{formatCOP(p.revenue)}</span>
                <span className="text-[9px] text-[var(--text-secondary)] shrink-0 hidden sm:inline">{p.quantity} uds</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}