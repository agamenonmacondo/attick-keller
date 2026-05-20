'use client'

import { AnimatedCard } from '../shared/AnimatedCard'
import { Crown, Medal, ThumbsUp, Sparkle, Minus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

interface SegmentBreakdownProps {
  segments: Record<string, number>
  total: number
}

const TIER_CONFIG: Record<string, { label: string; color: string; Icon: Icon }> = {
  vip:        { label: 'VIP',           color: '#C9A94E', Icon: Crown },
  regular:    { label: 'Regular',       color: '#5C7A4D', Icon: Medal },
  occasional: { label: 'Ocasional',     color: '#D4922A', Icon: ThumbsUp },
  new:        { label: 'Nuevo',         color: '#6B2737', Icon: Sparkle },
  none:       { label: 'Sin actividad', color: '#8D6E63', Icon: Minus },
}

export function SegmentBreakdown({ segments, total }: SegmentBreakdownProps) {
  const sortedSegments = Object.entries(segments)
    .map(([key, count]) => ({
      key: key || 'none',
      count,
      config: TIER_CONFIG[key] || { label: key, color: '#8D6E63', Icon: Minus },
    }))
    .sort((a, b) => b.count - a.count)

  const retainable = (segments.occasional || 0) + (segments.new || 0)
  const retainablePct = total > 0 ? ((retainable / total) * 100).toFixed(0) : '0'

  return (
    <AnimatedCard delay={0.24} className="bg-white rounded-xl border border-[#D7CCC8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#3E2723] tracking-wide uppercase">Segmentacion</h3>
        <span className="text-xs text-[#8D6E63]">{total.toLocaleString()} clientes</span>
      </div>

      <div className="space-y-2">
        {sortedSegments.map(({ key, count, config }) => {
          const pct = total > 0 ? ((count / total) * 100) : 0
          const SegmentIcon = config.Icon
          return (
            <div key={key} className="flex items-center gap-2">
              <SegmentIcon size={14} weight="duotone" color={config.color} className="flex-shrink-0" />
              <div className="w-24 text-xs text-[#5D4037] font-medium">{config.label}</div>
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
              <div className="w-24 text-right">
                <span className="text-xs font-semibold text-[#3E2723]">{count.toLocaleString()}</span>
                <span className="text-[10px] text-[#8D6E63] ml-1">({pct.toFixed(1)}%)</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#D7CCC8] text-center">
        <div className="text-[10px] text-[#8D6E63] uppercase tracking-wide mb-1">Oportunidad</div>
        <div className="text-sm font-semibold text-[#5C7A4D]">
          {retainablePct}% son retenibles
        </div>
        <div className="text-xs text-[#8D6E63]">
          con campanas de reactivacion
        </div>
      </div>
    </AnimatedCard>
  )
}
