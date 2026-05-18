'use client'

import { AnimatedCard } from '../shared/AnimatedCard'

interface KPIStatsProps {
  total: number
  recurring: number
  recent30: number
  recent90: number
  avgPartySize: number
  totalVisits: number
}

export function KPIStatsBar({ total, recurring, recent30, recent90, avgPartySize, totalVisits }: KPIStatsProps) {
  const retentionRate = total > 0 ? ((recurring / total) * 100).toFixed(1) : '0'
  const recentPct = total > 0 ? ((recent30 / total) * 100).toFixed(0) : '0'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      <AnimatedCard delay={0} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Total Clientes</div>
        <div className="text-xl font-bold text-[#3E2723]">{total.toLocaleString()}</div>
      </AnimatedCard>
      <AnimatedCard delay={0.04} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Recurrentes</div>
        <div className="text-xl font-bold text-[#2E7D32]">{recurring.toLocaleString()}</div>
        <div className="text-[10px] text-[#5C7A4D]">{retentionRate}%</div>
      </AnimatedCard>
      <AnimatedCard delay={0.08} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Activos 30d</div>
        <div className="text-xl font-bold text-[#D4922A]">{recent30.toLocaleString()}</div>
        <div className="text-[10px] text-[#8D6E63]">{recentPct}%</div>
      </AnimatedCard>
      <AnimatedCard delay={0.12} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Activos 90d</div>
        <div className="text-xl font-bold text-[#6B2737]">{recent90.toLocaleString()}</div>
      </AnimatedCard>
      <AnimatedCard delay={0.16} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Visitas Total</div>
        <div className="text-xl font-bold text-[#3E2723]">{totalVisits.toLocaleString()}</div>
      </AnimatedCard>
      <AnimatedCard delay={0.20} className="bg-white rounded-xl border border-[#D7CCC8] p-3 text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Prom Grupo</div>
        <div className="text-xl font-bold text-[#5C7A4D]">{avgPartySize}</div>
      </AnimatedCard>
    </div>
  )
}