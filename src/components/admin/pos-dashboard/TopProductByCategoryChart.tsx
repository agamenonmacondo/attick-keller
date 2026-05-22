'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'

interface TopProductByCategory {
  categoryId: string
  categoryName: string
  productId: string
  productName: string
  quantity: number
  revenue: number
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

export function TopProductByCategoryChart({ data }: { data: TopProductByCategory[] }) {
  if (!data || data.length === 0) return null

  const chartData = data.slice(0, 12).map(d => ({
    ...d,
    label: `${d.productName}`,
    shortCat: d.categoryName.length > 14 ? d.categoryName.slice(0, 12) + '..' : d.categoryName,
  }))

  return (
    <div>
      <SectionHeading>Producto estrella por categoria</SectionHeading>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        El producto mas vendido en cada linea
      </p>

      <div className="space-y-3">
        {chartData.map((item, i) => {
          const maxRevenue = chartData[0].revenue
          const widthPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
          const color = PALETTE[i % PALETTE.length]

          return (
            <div key={item.categoryId} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold uppercase tracking-wider shrink-0"
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
                  <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {item.productName}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
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
    </div>
  )
}