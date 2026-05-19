'use client'

import { AnimatedCard } from '../shared/AnimatedCard'

interface RetentionFunnelProps {
  retention: {
    oneTime: number
    twoToThree: number
    fourToFive: number
    sixToTen: number
    vip: number
  }
  total: number
}

const STAGES = [
  { key: 'oneTime' as const, label: '1 Visita', color: '#C62828', bg: '#FFEBEE' },
  { key: 'twoToThree' as const, label: '2-3 Visitas', color: '#E65100', bg: '#FFF3E0' },
  { key: 'fourToFive' as const, label: '4-5 Visitas', color: '#F9A825', bg: '#FFFDE7' },
  { key: 'sixToTen' as const, label: '6-10 Visitas', color: '#2E7D32', bg: '#E8F5E9' },
  { key: 'vip' as const, label: '11+ VIP', color: '#1B5E20', bg: '#C8E6C9' },
]

export function RetentionFunnel({ retention, total }: RetentionFunnelProps) {
  const maxVal = Math.max(...STAGES.map(s => retention[s.key] || 0), 1)

  return (
    <AnimatedCard delay={0} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Embudo de Retención</h3>
        <span className="text-xs text-[#8D6E63]">{total.toLocaleString()} clientes</span>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((stage) => {
          const value = retention[stage.key] || 0
          const pct = total > 0 ? ((value / total) * 100) : 0
          const barWidth = Math.max((value / maxVal) * 100, 4)

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-20 text-xs text-[#5D4037] text-right flex-shrink-0">{stage.label}</div>
              <div className="flex-1 h-7 bg-[#F5EDE0] rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-700 ease-out flex items-center px-2"
                  style={{ width: `${barWidth}%`, backgroundColor: stage.color }}
                >
                  {pct >= 8 && (
                    <span className="text-[10px] font-semibold text-white">{pct.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="w-16 text-xs font-medium text-[#3E2723] text-right">{value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-3 border-t border-[#D7CCC8] grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[#C62828]">
            {total > 0 ? ((retention.oneTime || 0) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[#8D6E63]">Fuga</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#E65100]">
            {total > 0 ? ((retention.twoToThree || 0) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[#8D6E63]">Ocasionales</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#2E7D32]">
            {total > 0 ? (((retention.fourToFive || 0) + (retention.sixToTen || 0) + (retention.vip || 0)) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[#8D6E63]">Fieles</div>
        </div>
      </div>
    </AnimatedCard>
  )
}