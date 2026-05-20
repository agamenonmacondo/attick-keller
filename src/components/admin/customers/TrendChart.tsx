'use client'

import { useWeeklyTrends } from '@/lib/hooks/useWeeklyTrends'
import { AnimatedCard } from '../shared/AnimatedCard'
import { ChartLineUp } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  active: '#6B2737',
  new: '#5C7A4D',
  noShow: '#D4922A',
}

export function TrendChart() {
  const { data, loading, error } = useWeeklyTrends()

  if (loading) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[#D7CCC8] rounded w-1/4 mb-3"></div>
            <div className="h-48 bg-[#D7CCC8] rounded"></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <p className="text-[#C62828] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  const trends = data?.trends || []

  if (trends.length === 0) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider mb-3 flex items-center gap-2">
            <ChartLineUp size={16} weight="duotone" color="#6B2737" />
            Tendencias Semanales
          </h3>
          <p className="text-[#8D6E63] text-sm">Sin datos de tendencia disponibles</p>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard delay={0.5}>
      <div className="p-5">
        <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider mb-4 flex items-center gap-2">
          <ChartLineUp size={16} weight="duotone" color="#6B2737" />
          Tendencias Semanales
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#8D6E63' }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11, fill: '#8D6E63' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #D7CCC8', fontSize: '12px', background: '#F5EDE0' }}
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
            <Line
              type="monotone"
              dataKey="activeCount"
              stroke={COLORS.active}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="newCount"
              stroke={COLORS.new}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="noShowCount"
              stroke={COLORS.noShow}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  )
}
