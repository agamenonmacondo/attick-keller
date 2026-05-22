'use client'

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
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Top Productos</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

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
            {data.map((p, i) => (
              <tr key={p.productId} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-input)]" style={{ transition: 'background 150ms ease-out' }}>
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
    </div>
  )
}