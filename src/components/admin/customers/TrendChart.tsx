'use client'

import { useWeeklyTrends } from '@/lib/hooks/useWeeklyTrends'
import { useTheme } from '@/lib/ThemeProvider'
import { AnimatedCard } from '../shared/AnimatedCard'
import { ChartLineUp } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  active: 'var(--color-accent)',
  new: 'var(--color-success)',
  noShow: 'var(--color-warning)',
}

export function TrendChart() {
  const { data, loading, error } = useWeeklyTrends()
  const { theme } = useTheme()

  if (loading) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--border-default)] rounded w-1/4 mb-3"></div>
            <div className="h-48 bg-[var(--border-default)] rounded"></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <p className="text-[var(--color-danger)] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  const trends = data?.trends || []

  if (trends.length === 0) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <ChartLineUp size={16} weight="duotone" color="var(--color-accent)" />
            Tendencias Semanales
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">Sin datos de tendencia disponibles</p>
        </div>
      </AnimatedCard>
    )
  }

  const isDark = theme === 'dark'
  const gridColor = isDark ? 'var(--border-default)' : 'var(--border-light)'
  const tickColor = isDark ? 'var(--text-muted)' : 'var(--text-secondary)'
  const tooltipBg = isDark ? 'var(--bg-card)' : 'var(--bg-card)'
  const tooltipBorder = isDark ? 'var(--border-default)' : 'var(--border-light)'
  const lineActive = 'var(--color-ak-borgona)'
  const lineNew = 'var(--color-ak-oliva)'
  const lineNoShow = 'var(--color-ak-ambar)'

  return (
    <AnimatedCard delay={0.5}>
      <div className="p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <ChartLineUp size={16} weight="duotone" color="var(--color-accent)" />
          Tendencias Semanales
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tickColor }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: `1px solid ${tooltipBorder}`, fontSize: '12px', background: tooltipBg, color: 'var(--text-primary)' }}
              formatter={((value: any, name: any) => {
                const labels: Record<string, string> = {
                  activeCount: 'Clientes activos',
                  newCount: 'Nuevos',
                  noShowCount: 'No-shows',
                }
                return [value, labels[name] || name]
              }) as any}
            />
            <Legend
              formatter={((value: any) => {
                const labels: Record<string, string> = {
                  activeCount: 'Activos',
                  newCount: 'Nuevos',
                  noShowCount: 'No-shows',
                }
                return labels[value] || value
              }) as any}
            />
            <Line type="monotone" dataKey="activeCount" stroke={lineActive} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="newCount" stroke={lineNew} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="noShowCount" stroke={lineNoShow} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  )
}
