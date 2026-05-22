'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

const CHART_PALETTE = ['#6B2737', '#5C7A4D', '#D4922A', '#C9A94E', '#3E2723', '#8B5E3C', '#2D5016', '#B8860B', '#4A3728', '#6B8E23']

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
}

export function CategoryBreakdown({ data, selectedCategory, onCategoryClick }: CategoryBreakdownProps) {
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

          return (
            <button
              key={d.categoryId}
              onClick={() => onCategoryClick(isSelected ? 'all' : d.categoryId)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: color, opacity }}
                />
                <span className={`text-[11px] truncate ${isSelected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} style={{ transition: 'color 150ms ease-out' }}>
                  {d.categoryName}
                </span>
                <span className="ml-auto text-[11px] font-mono tabular-nums text-[var(--text-primary)]">{formatCOPDisplay(d.revenue)}</span>
              </div>
              <div className="h-2.5 bg-[var(--bg-input)] rounded overflow-hidden ml-4">
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
                <span className="text-[9px] text-[var(--text-secondary)]">{d.quantity.toLocaleString('es-CO')} uds</span>
                <span className="text-[9px] text-[var(--text-secondary)]">{d.cheques} cheques</span>
              </div>
            </button>
          )
        })}
        {top15.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
        )}
      </div>
    </div>
  )
}