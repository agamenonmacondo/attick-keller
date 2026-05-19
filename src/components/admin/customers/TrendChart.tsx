'use client'

import { useWeeklyTrends } from '@/lib/hooks/useWeeklyTrends'
import { AnimatedCard } from '../shared/AnimatedCard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  active: '#6B2737',
  new: '#5C7A4D',
  noShow: '#D4922A',
}

export function TrendChart() {
  const { data, loading, error } = useWeeklyTrends(8)

  if (loading) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-[#D7CCC8] rounded w-1/3 mb-3"></div>
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
          <p className="text-[#6B2737] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data || data.trends.length === 0) {
    return (
      <AnimatedCard delay={0.5}>
        <div className="p-5">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider mb-3">
            📈 Tendencias Semanales
          </h3>
          <p className="text-sm text-[#8D6E63]">Datos insuficientes para mostrar tendencias</p>
        </div>
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard delay={0.5}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
            📈 Tendencias Semanales
          </h3>
          <span className="text-[10px] text-[#8D6E63]">Últimas {data.trends.length} semanas</span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#8D6E63' }}
              axisLine={{ stroke: '#D7CCC8' }}
            />
            <YAxis tick={{ fontSize: 10, fill: '#8D6E63' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #D7CCC8', fontSize: '12px', backgroundColor: '#F5EDE0' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              dot={{ r: 3, fill: COLORS.active }}
            />
            <Line
              type="monotone"
              dataKey="newCount"
              stroke={COLORS.new}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.new }}
            />
            <Line
              type="monotone"
              dataKey="noShowCount"
              stroke={COLORS.noShow}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: COLORS.noShow }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  )
}