'use client'

import { useTableDemand } from '@/lib/hooks/useTableDemand'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Armchair, Warning } from '@phosphor-icons/react'
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
          <p className="text-[#C62828] text-sm">Error: {error}</p>
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
          <h3 className="text-sm font-semibold text-[#3E2723] uppercase tracking-wider flex items-center gap-2">
            <Armchair size={16} weight="duotone" color="#6B2737" />
            Demanda vs Mesas
          </h3>
          {data.mismatch && (
            <span className="text-xs bg-[#D4922A]/15 text-[#D4922A] px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <Warning size={12} /> Desbalance
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8D6E63' }} label={{ value: 'Personas', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#8D6E63' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8D6E63' }} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #D7CCC8', fontSize: '12px', background: '#F5EDE0' }}
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
          <div className="bg-[#D4922A]/15 border border-[#D4922A]/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-[#3E2723]">
              <span className="font-semibold">Recomendacion:</span> {data.recommendation}
            </p>
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}
