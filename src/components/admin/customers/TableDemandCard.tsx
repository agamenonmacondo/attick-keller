'use client'

import { useTableDemand } from '@/lib/hooks/useTableDemand'
import { useTheme } from '@/lib/ThemeProvider'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Armchair, Warning } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

export function TableDemandCard() {
  const { data, loading, error } = useTableDemand()
  const { theme } = useTheme()

  if (loading) {
    return (
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--border-default)] rounded w-1/3 mb-3"></div>
            <div className="h-48 bg-[var(--border-default)] rounded"></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <p className="text-[var(--color-danger)] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data) return null

  const isDark = theme === 'dark'
  const DEMAND_COLORS = isDark ? ['var(--color-danger)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-ak-cal)'] : ['var(--color-ak-borgona)', 'var(--color-ak-oliva)', 'var(--color-ak-ambar)', 'var(--color-ak-madera)']
  const SUPPLY_COLORS = isDark ? ['#7a4a56', '#5a7049', '#b89050', '#6a5a48'] : ['#a87891', '#9ab88d', '#e6b86a', '#7a6654']
  const gridColor = isDark ? 'var(--border-default)' : 'var(--border-light)'
  const tickColor = isDark ? 'var(--text-muted)' : 'var(--text-secondary)'
  const tooltipBg = isDark ? 'var(--bg-card)' : 'var(--bg-card)'
  const tooltipBorder = isDark ? 'var(--border-default)' : 'var(--border-light)'

  const chartData = [
    { name: '2', demanda: data.demand.size2, oferta: data.supply.size2 },
    { name: '3-4', demanda: data.demand.size4, oferta: data.supply.size4 },
    { name: '5-6', demanda: data.demand.size6, oferta: data.supply.size6 },
    { name: '7+', demanda: data.demand.size8plus, oferta: data.supply.size8plus },
  ]

  return (
    <AnimatedCard delay={0.6}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Armchair size={16} weight="duotone" color="var(--color-accent)" />
            Demanda vs Mesas
          </h3>
          {data.mismatch && (
            <span className="text-xs bg-[var(--color-warning)]/15 text-[var(--color-warning)] px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <Warning size={12} /> Desbalance
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} label={{ value: 'Personas', position: 'insideBottom', offset: -2, fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: `1px solid ${tooltipBorder}`, fontSize: '12px', background: tooltipBg, color: isDark ? 'var(--text-primary)' : 'var(--text-primary)' }}
              formatter={((value: any, name: any) => [`${value}%`, name === 'demanda' ? 'Demanda' : 'Oferta de mesas']) as any}
            />
            <Legend formatter={(value: string) => value === 'demanda' ? 'Demanda' : 'Mesas disponibles'} />
            <Bar dataKey="demanda" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`demand-${index}`} fill={DEMAND_COLORS[index]} />
              ))}
            </Bar>
            <Bar dataKey="oferta" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`supply-${index}`} fill={SUPPLY_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {data.recommendation && (
          <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-[var(--text-primary)]">
              <span className="font-semibold">Recomendacion:</span> {data.recommendation}
            </p>
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}
