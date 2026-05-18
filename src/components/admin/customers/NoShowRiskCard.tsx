'use client'

import { AnimatedCard } from '../shared/AnimatedCard'

interface NoShowRiskProps {
  risk: {
    noRisk: number
    lowRisk: number
    medRisk: number
    highRisk: number
  }
  totalNoShows: number
  totalClients: number
}

export function NoShowRiskCard({ risk, totalNoShows, totalClients }: NoShowRiskProps) {
  const total = risk.noRisk + risk.lowRisk + risk.medRisk + risk.highRisk
  const rate = totalClients > 0 ? ((totalNoShows / (totalClients * 1.5)) * 100).toFixed(1) : '0'

  return (
    <AnimatedCard delay={0.12} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Riesgo No-Show</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100] font-medium">
          {totalNoShows.toLocaleString()} no-shows
        </span>
      </div>

      {/* Risk bars */}
      <div className="space-y-2">
        {[
          { label: 'Sin riesgo', count: risk.noRisk, color: '#4CAF50', bg: '#E8F5E9' },
          { label: 'Riesgo bajo (1)', count: risk.lowRisk, color: '#FF9800', bg: '#FFF3E0' },
          { label: 'Riesgo medio (2-3)', count: risk.medRisk, color: '#FF5722', bg: '#FBE9E7' },
          { label: 'Riesgo alto (4+)', count: risk.highRisk, color: '#C62828', bg: '#FFEBEE' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-28 text-xs text-[#5D4037] flex-shrink-0">{label}</div>
            <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: bg }}>
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${Math.max((count / total) * 100, 2)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="w-14 text-xs font-medium text-right text-[#3E2723]">{count.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mt-3 pt-3 border-t border-[#D7CCC8] flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-bold text-[#C62828]">{risk.highRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[#8D6E63]">Alto riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[#E65100]">{risk.medRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[#8D6E63]">Medio riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[#5C7A4D]">{risk.lowRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[#8D6E63]">Bajo riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[#2E7D32]">{risk.noRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[#8D6E63]">Sin riesgo</div>
        </div>
      </div>
    </AnimatedCard>
  )
}