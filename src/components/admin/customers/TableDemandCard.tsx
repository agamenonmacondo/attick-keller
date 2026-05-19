'use client'

import { useTableDemand } from '@/lib/hooks/useTableDemand'
import { AnimatedCard } from '../shared/AnimatedCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export function TableDemandCard() {
  const { data, loading, error } = useTableDemand()

  if (loading) {
    return (
      <AnimatedCard delay={0.6}>
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
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <p className="text-[#6B2737] text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data) {
    return (
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider mb-3">
            🪑 Demanda vs Mesas
          </h3>
          <p className="text-sm text-[#8D6E63]">Datos insuficientes</p>
        </div>
      </AnimatedCard>
    )
  }

  // Transform flat {demand: {size2, size4, ...}, supply: {size2, size4, ...}} into chart data
  const chartData = [
    { label: '2 personas', demanda: data.demand.size2, mesas: data.supply.size2 },
    { label: '3-4 personas', demanda: data.demand.size4, mesas: data.supply.size4 },
    { label: '5-6 personas', demanda: data.demand.size6, mesas: data.supply.size6 },
    { label: '7+ personas', demanda: data.demand.size8plus, mesas: data.supply.size8plus },
  ]

  return (
    <AnimatedCard delay={0.6}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#8D6E63] uppercase tracking-wider">
            🪑 Demanda vs Mesas
          </h3>
        </div>

        {data.mismatch && data.recommendation && (
          <div className="bg-[#D4922A]/10 border border-[#D4922A]/20 rounded-lg p-2.5 mb-3">
            <p className="text-xs text-[#3E2723]">
              ⚡ {data.recommendation}
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8D6E63' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8D6E63' }} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #D7CCC8', fontSize: '12px', backgroundColor: '#F5EDE0' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: any, name: any) => [`${value}%`, name === 'demanda' ? 'Demanda' : 'Oferta de mesas'] as any)}
            />
            <Legend formatter={(value: string) => value === 'demanda' ? 'Demanda' : 'Mesas disponibles'} />
            <Bar dataKey="demanda" fill="#6B273799" radius={[4, 4, 0, 0]} />
            <Bar dataKey="mesas" fill="#5C7A4D80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  )
}