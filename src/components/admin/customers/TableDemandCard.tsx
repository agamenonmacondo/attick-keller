'use client'

import { useTableDemand } from '@/lib/hooks/useTableDemand'
import { AnimatedCard } from '../shared/AnimatedCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

const DEMAND_COLORS = ['#6B2737', '#5C7A4D', '#D4922A', '#3E2723']
const SUPPLY_COLORS = ['#a87891', '#9ab88d', '#e6b86a', '#7a6654']

export function TableDemandCard() {
  const { data, loading, error } = useTableDemand()

  if (loading) {
    return (
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <div className="animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-1/3 mb-3"></div>
            <div className="h-48 bg-stone-200 rounded"></div>
          </div>
        </div>
      </AnimatedCard>
    )
  }

  if (error) {
    return (
      <AnimatedCard delay={0.6}>
        <div className="p-5">
          <p className="text-red-600 text-sm">Error: {error}</p>
        </div>
      </AnimatedCard>
    )
  }

  if (!data) return null

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
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            🪑 Demanda vs Mesas
          </h3>
          {data.mismatch && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
              ⚠️ Desbalance
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} label={{ value: 'Personas', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#a8a29e' }} />
            <YAxis tick={{ fontSize: 11, fill: '#78716c' }} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">💡 Recomendación:</span> {data.recommendation}
            </p>
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}