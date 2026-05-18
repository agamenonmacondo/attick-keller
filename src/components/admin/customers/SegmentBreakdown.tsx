'use client'

import { AnimatedCard } from '../shared/AnimatedCard'

interface SegmentBreakdownProps {
  segments: Record<string, number>
  total: number
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  vip:        { label: 'VIP',           color: '#1B5E20', icon: '🌟' },
  habitual:   { label: 'Habitual',      color: '#2E7D32', icon: '🏆' },
  frecuente:  { label: 'Frecuente',     color: '#F9A825', icon: '👍' },
  ocasional:  { label: 'Ocasional',     color: '#E65100', icon: '🔄' },
  nuevo:      { label: 'Nuevo',         color: '#1565C0', icon: '✨' },
  prospecto:  { label: 'Prospecto',     color: '#9E9E9E', icon: '❓' },
  none:       { label: 'Sin clase',     color: '#BDBDBD', icon: '—' },
}

export function SegmentBreakdown({ segments, total }: SegmentBreakdownProps) {
  const sortedSegments = Object.entries(segments)
    .map(([key, count]) => ({
      key: key || 'none',
      count,
      config: TIER_CONFIG[key] || TIER_CONFIG['none'],
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <AnimatedCard delay={0.24} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Segmentación</h3>
        <span className="text-xs text-[#8D6E63]">{total.toLocaleString()} clientes</span>
      </div>

      <div className="space-y-2">
        {sortedSegments.map(({ key, count, config }) => {
          const pct = total > 0 ? ((count / total) * 100) : 0
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{config.icon}</span>
              <div className="w-20 text-xs text-[#5D4037] font-medium">{config.label}</div>
              <div className="flex-1 h-5 bg-[#F5EDE0] rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-700"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: config.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <div className="w-20 text-right">
                <span className="text-xs font-semibold text-[#3E2723]">{count.toLocaleString()}</span>
                <span className="text-[10px] text-[#8D6E63] ml-1">({pct.toFixed(1)}%)</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Key insight */}
      <div className="mt-4 pt-3 border-t border-[#D7CCC8] text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Oportunidad</div>
        <div className="text-sm font-semibold text-[#5C7A4D]">
          {total > 0 ? ((segments.ocasional || 0) / total * 100).toFixed(0) : 0}% son retenibles
        </div>
        <div className="text-xs text-[#8D6E63]">
          con campañas de reactivación
        </div>
      </div>
    </AnimatedCard>
  )
}