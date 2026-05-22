'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

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
}

export function TopProductsTable({ data, initialLimit = 10, expandedLimit = 15, onProductDrillDown }: TopProductsTableProps) {
  const [expanded, setExpanded] = useState(false)

  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Top Productos</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  const visibleData = expanded ? data.slice(0, expandedLimit) : data.slice(0, initialLimit)
  const canExpand = data.length > initialLimit

  return (
    <div>
      <SectionHeading>Top Productos</SectionHeading>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">#</th>
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Producto</th>
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria</th>
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
                <td className="py-2 pr-3 text-[var(--text-secondary)] max-w-[120px] truncate">{p.category}</td>
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
          {expanded ? 'Ver menos' : `Ver mas (${data.length - initialLimit} mas)`}
        </button>
      )}
    </div>
  )
}