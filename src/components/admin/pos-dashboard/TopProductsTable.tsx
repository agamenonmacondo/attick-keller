'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface ProductInCategory {
  productId: string
  productName: string
  quantity: number
  revenue: number
  cheques: number
}

interface TopProductsTableProps {
  data: Array<{
    productId: string
    productName: string
    category: string
    quantity: number
    revenue: number
  }>
  initialLimit?: number
  expandedLimit?: number
  onProductDrillDown?: (productId: string, productName: string) => void
  selectedCategory?: string
  productsByCategory?: Record<string, ProductInCategory[]>
  selectedCategoryName?: string
}

export function TopProductsTable({ data, initialLimit = 10, expandedLimit = 15, onProductDrillDown, selectedCategory, productsByCategory, selectedCategoryName }: TopProductsTableProps) {
  const [expanded, setExpanded] = useState(false)

  // When a category is selected, show products from that category
  const isCategoryFiltered = selectedCategory && selectedCategory !== 'all' && productsByCategory
  const categoryProducts = isCategoryFiltered ? (productsByCategory[selectedCategory] || []) : null

  // Diagnostic: warn if category selected but no products found (key mismatch)
  if (isCategoryFiltered && productsByCategory && categoryProducts && categoryProducts.length === 0) {
    console.warn('[TopProductsTable] Category selected but no products found:', {
      selectedCategory,
      availableKeys: Object.keys(productsByCategory),
    })
  }

  // Build display data based on category filter
  const displayData: Array<{ productId: string; productName: string; label: string; quantity: number; revenue: number }> = categoryProducts
    ? categoryProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        label: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
      }))
    : data.map(p => ({
        productId: p.productId,
        productName: p.productName,
        label: p.category,
        quantity: p.quantity,
        revenue: p.revenue,
      }))

  const headerTitle = categoryProducts
    ? `Top Productos — ${selectedCategoryName || selectedCategory}`
    : 'Top Productos'

  if (displayData.length === 0) {
    return (
      <div>
        <SectionHeading>{headerTitle}</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  const limit = categoryProducts ? 50 : initialLimit
  const maxLimit = categoryProducts ? 50 : expandedLimit
  const visibleData = expanded ? displayData.slice(0, maxLimit) : displayData.slice(0, limit)
  const canExpand = displayData.length > limit

  return (
    <div>
      <SectionHeading>{headerTitle}</SectionHeading>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-[10px] sm:text-xs min-w-[500px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">#</th>
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Producto</th>
              {!categoryProducts && (
                <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria</th>
              )}
              {categoryProducts && (
                <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Cheques</th>
              )}
              <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Qty</th>
              <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((p, i) => (
              <tr
                key={p.productId}
                className={`border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-input)] ${onProductDrillDown ? 'cursor-pointer' : ''}`}
                style={{ transition: 'background 150ms ease-out' }}
                onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                title={onProductDrillDown ? 'Ver detalle del producto' : undefined}
              >
                <td className="py-2 pr-3 text-[var(--text-secondary)] tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3 text-[var(--text-primary)] font-medium max-w-[180px] truncate">{p.productName}</td>
                {!categoryProducts && (
                  <td className="py-2 pr-3 text-[var(--text-secondary)] max-w-[120px] truncate">{p.label !== p.productName ? p.label : ''}</td>
                )}
                {categoryProducts && (
                  <td className="py-2 pr-3 text-right text-[var(--text-secondary)] tabular-nums">
                    {(categoryProducts.find(cp => cp.productId === p.productId)?.cheques || 0).toLocaleString('es-CO')}
                  </td>
                )}
                <td className="py-2 pr-3 text-right text-[var(--text-primary)] tabular-nums">{p.quantity.toLocaleString('es-CO')}</td>
                <td className="py-2 text-right text-[var(--text-primary)] tabular-nums font-medium">{formatCOPDisplay(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canExpand && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="mt-2 flex items-center gap-1 text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
        >
          <CaretDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Ver menos' : `Ver mas (${displayData.length - limit} mas)`}
        </button>
      )}
    </div>
  )
}