'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

const PALETTE = ['#6B2737', '#5C7A4D', '#D4922A', '#C9A94E', '#3E2723', '#8B5E3C', '#2D5016', '#B8860B']

interface PaymentMethodsChartProps {
  data: Array<{
    method: string
    amount: number
    count: number
    pct: number
  }>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: { method: string; amount: number; count: number; pct: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-[var(--text-primary)] mb-0.5">{d.method}</p>
      <p className="text-[var(--text-secondary)]">{formatCOPDisplay(d.amount)} ({d.pct}%)</p>
      <p className="text-[var(--text-secondary)]">{d.count} pagos</p>
    </div>
  )
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Metodos de Pago</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  // Merge small methods into "Otros" if > 6
  let displayData = data
  if (data.length > 6) {
    const top5 = data.slice(0, 5)
    const otherTotal = data.slice(5).reduce((s, d) => ({
      method: 'Otros',
      amount: s.amount + d.amount,
      count: s.count + d.count,
      pct: s.pct + d.pct,
    }), { method: 'Otros', amount: 0, count: 0, pct: 0 })
    displayData = [...top5, otherTotal]
  }

  return (
    <div>
      <SectionHeading>Metodos de Pago</SectionHeading>
      <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={displayData}
              dataKey="amount"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {displayData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 text-xs">
          {displayData.map((d, i) => (
            <div key={d.method} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-[var(--text-secondary)] truncate max-w-[120px]">{d.method}</span>
              <span className="text-[var(--text-primary)] font-mono tabular-nums ml-auto">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}