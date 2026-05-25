'use client'

import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

const CHART_PALETTE = ['#6B2737', '#5C7A4D', '#D4922A', '#C9A94E', '#3E2723', '#8B5E3C', '#2D5016', '#B8860B', '#4A3728', '#6B8E23']

interface ProductInCategory {
  productId: string
  productName: string
  quantity: number
  revenue: number
  cheques: number
}

interface CategoryBreakdownProps {
  data: Array<{
    categoryId: string
    categoryName: string
    quantity: number
    revenue: number
    cheques: number
  }>
  selectedCategory: string
  onCategoryClick: (categoryId: string) => void
  onCategoryDrillDown?: (categoryId: string, categoryName: string) => void
  onProductDrillDown?: (productId: string, productName: string) => void
  productsByCategory?: Record<string, ProductInCategory[]>
}

export function CategoryBreakdown({ data, selectedCategory, onCategoryClick, onCategoryDrillDown, onProductDrillDown, productsByCategory }: CategoryBreakdownProps) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const top15 = data.slice(0, 15)

  return (
    <div>
      <SectionHeading>Categorias de Producto</SectionHeading>
      <div className="space-y-1.5 mt-3">
        {top15.map((d, i) => {
          const widthPct = (d.revenue / maxRevenue) * 100
          const isSelected = selectedCategory === d.categoryId
          const isAllSelected = selectedCategory === 'all'
          const color = CHART_PALETTE[i % CHART_PALETTE.length]
          const opacity = isAllSelected || isSelected ? 1 : 0.35
          const categoryProducts = isSelected && productsByCategory ? productsByCategory[d.categoryId] : undefined

          return (
            <div key={d.categoryId} className="w-full group">
              {/* Entire row clickable for drill-down */}
              <div
                className={`flex items-center gap-2 mb-0.5 rounded-sm px-1 -mx-1 ${onCategoryDrillDown ? 'cursor-pointer hover:bg-[var(--bg-input)]' : ''}`}
                onClick={onCategoryDrillDown ? () => onCategoryDrillDown(d.categoryId, d.categoryName) : undefined}
                title={onCategoryDrillDown ? 'Ver detalle de categoria' : undefined}
              >
                {/* Color dot */}
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: color, opacity }}
                />
                {/* Category name — clicking this toggles filter/expand */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCategoryClick(isSelected ? 'all' : d.categoryId)
                  }}
                  className="flex items-center gap-1.5"
                >
                  {isSelected && categoryProducts && categoryProducts.length > 0 ? (
                    <CaretDown size={10} className="text-[var(--color-ak-borgona)] shrink-0" weight="bold" />
                  ) : (
                    <CaretRight size={10} className="text-[var(--text-secondary)] shrink-0 opacity-0 group-hover:opacity-60" weight="bold" />
                  )}
                  <span
                    className={`text-[10px] sm:text-[11px] truncate ${isSelected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                    style={{ transition: 'color 150ms ease-out' }}
                  >
                    {d.categoryName}
                  </span>
                </button>
                {/* Revenue */}
                <span
                  className="ml-auto text-[10px] sm:text-[11px] font-mono tabular-nums text-[var(--text-primary)]"
                  style={{ transition: 'color 150ms ease-out' }}
                >
                  {formatCOPDisplay(d.revenue)}
                </span>
                {onCategoryDrillDown && (
                  <span className="text-[9px] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 shrink-0" style={{ transition: 'opacity 150ms ease-out' }}>
                    detalle
                  </span>
                )}
              </div>
              {/* Revenue bar */}
              <div
                className={`h-2.5 bg-[var(--bg-input)] rounded overflow-hidden ml-4 ${onCategoryDrillDown ? 'cursor-pointer' : ''}`}
                onClick={onCategoryDrillDown ? () => onCategoryDrillDown(d.categoryId, d.categoryName) : undefined}
                title={onCategoryDrillDown ? 'Ver detalle de categoria' : undefined}
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    opacity,
                    transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease-out',
                  }}
                />
              </div>
              <div className="flex items-center gap-3 mt-0.5 ml-4">
                <span className="text-[9px] sm:text-[10px] text-[var(--text-secondary)]">{d.quantity.toLocaleString('es-CO')} uds</span>
                <span className="text-[9px] sm:text-[10px] text-[var(--text-secondary)]">{d.cheques} cheques</span>
              </div>

              {/* Inline expandible: products list for selected category */}
              {isSelected && categoryProducts && categoryProducts.length > 0 && (
                <div className="ml-5 mt-2 mb-1 border-l-2 border-[var(--border-default)] pl-3 space-y-0.5">
                  {categoryProducts.map((p, pi) => {
                    const productMaxRev = categoryProducts[0]?.revenue || 1
                    const barPct = (p.revenue / productMaxRev) * 100
                    return (
                      <div
                        key={p.productId}
                        className={`group/prod py-1 px-1.5 rounded-sm -mx-1.5 ${onProductDrillDown ? 'cursor-pointer hover:bg-[var(--bg-input)]' : ''}`}
                        onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                        title={onProductDrillDown ? `Ver detalle: ${p.productName}` : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <CaretRight size={8} className="text-[var(--text-secondary)] shrink-0 opacity-0 group-hover/prod:opacity-60" weight="bold" />
                          <span className="text-[10px] sm:text-[11px] text-[var(--text-primary)] truncate flex-1" title={p.productName}>
                            {p.productName}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-[var(--text-primary)] shrink-0">
                            {formatCOPDisplay(p.revenue)}
                          </span>
                        </div>
                        {/* Mini revenue bar per product */}
                        <div className="h-1.5 bg-[var(--bg-input)] rounded overflow-hidden ml-3.5 mt-0.5">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: color,
                              opacity: 0.6,
                              transition: 'width 400ms ease-out',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2.5 ml-3.5 mt-0.5">
                          <span className="text-[8px] sm:text-[9px] text-[var(--text-secondary)]">{p.quantity.toLocaleString('es-CO')} uds</span>
                          <span className="text-[8px] sm:text-[9px] text-[var(--text-secondary)]">{p.cheques} chq</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {top15.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
        )}
      </div>
    </div>
  )
}