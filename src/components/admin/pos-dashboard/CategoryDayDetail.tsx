'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { formatCOPDisplay } from './KPICard'

export interface CategoryData {
  categoryId: string
  categoryName: string
  quantity: number
  revenue: number
  cheques: number
  tipTotal?: number
  tipAvg?: number
  avgServiceTime?: number
  partySizeAvg?: number
}

export interface ProductData {
  productId: string
  productName: string
  quantity: number
  revenue: number
  cheques: number
}

interface CategoryDayDetailProps {
  categories: Array<CategoryData>
  productsByCategory: Record<string, Array<ProductData>>
  onProductDrillDown: (id: string, name: string) => void
}

function CategoryCard({
  category,
  products,
  onProductDrillDown,
}: {
  category: CategoryData
  products: Array<ProductData>
  onProductDrillDown: (id: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  // Sort products by revenue descending, take top 5
  const topProducts = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight)
    }
  }, [expanded, topProducts.length])

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--border-default)]/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-ak-borgona)]">
            {expanded ? <CaretDown size={14} weight="fill" /> : <CaretRight size={14} weight="fill" />}
          </span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{category.categoryName}</span>
        </div>
        <span className="text-sm font-bold text-[var(--color-ak-borgona)] tabular-nums">
          {formatCOPDisplay(category.revenue)}
        </span>
      </button>

      {/* Collapsible body */}
      <div
        style={{
          maxHeight: expanded ? maxHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 300ms ease-in-out',
        }}
      >
        <div ref={contentRef} className="px-4 pb-3">
          {/* Column headers */}
          <div className="flex items-center text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-1 border-b border-[var(--border-default)] pb-1">
            <span className="flex-1">Producto</span>
            <span className="w-16 text-right">Qty</span>
            <span className="w-24 text-right">Revenue</span>
          </div>

          {/* Product rows */}
          {topProducts.map(product => (
            <button
              key={product.productId}
              onClick={() => onProductDrillDown(product.productId, product.productName)}
              className="w-full flex items-center py-1.5 border-b border-[var(--border-default)]/50 last:border-0 hover:bg-[var(--color-ak-borgona)]/5 transition-colors text-left group"
            >
              <span className="flex-1 text-xs text-[var(--text-primary)] group-hover:text-[var(--color-ak-borgona)] truncate transition-colors">
                {product.productName}
              </span>
              <span className="w-16 text-right text-xs text-[var(--text-secondary)] tabular-nums">
                {product.quantity.toLocaleString('es-CO')}
              </span>
              <span className="w-24 text-right text-xs font-medium text-[var(--text-primary)] tabular-nums">
                {formatCOPDisplay(product.revenue)}
              </span>
            </button>
          ))}

          {topProducts.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">Sin productos</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function CategoryDayDetail({ categories, productsByCategory, onProductDrillDown }: CategoryDayDetailProps) {
  // Filter only categories that have data, take up to 5
  const activeCategories = categories
    .filter(c => c.revenue > 0 || c.quantity > 0)
    .slice(0, 5)

  if (activeCategories.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
        <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos de categorias</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[var(--text-primary)] px-1 mb-1">Categorias</h3>
      {activeCategories.map(cat => (
        <CategoryCard
          key={cat.categoryId}
          category={cat}
          products={productsByCategory[cat.categoryId] || []}
          onProductDrillDown={onProductDrillDown}
        />
      ))}
    </div>
  )
}