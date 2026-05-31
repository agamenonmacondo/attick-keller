'use client'

import { AnimatedCard } from '../shared/AnimatedCard'
import { Crown, Medal, ThumbsUp, Sparkle, Minus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

interface SegmentBreakdownProps {
  segments: Record<string, number>
  total: number
}

const TIER_CONFIG: Record<string, { label: string; color: string; Icon: Icon }> = {
  vip:        { label: 'VIP',           color: 'var(--color-ak-dorado)', Icon: Crown },
  regular:    { label: 'Regular',       color: 'var(--color-success)', Icon: Medal },
  occasional: { label: 'Ocasional',     color: 'var(--color-warning)', Icon: ThumbsUp },
  new:        { label: 'Nuevo',         color: 'var(--color-accent)', Icon: Sparkle },
  none:       { label: 'Sin actividad', color: 'var(--text-muted)', Icon: Minus },
}

export function SegmentBreakdown({ segments, total }: SegmentBreakdownProps) {
  const sortedSegments = Object.entries(segments)
    .map(([key, count]) => ({
      key: key || 'none',
      count,
      config: TIER_CONFIG[key] || { label: key, color: 'var(--text-muted)', Icon: Minus },
    }))
    .sort((a, b) => b.count - a.count)

  const retainable = (segments.occasional || 0) + (segments.new || 0)
  const retainablePct = total > 0 ? ((retainable / total) * 100).toFixed(0) : '0'

  return (
    <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">Segmentacion</h3>
        <span className="text-xs text-[var(--text-secondary)]">{total.toLocaleString()} clientes</span>
      </div>

      <div className="space-y-2">
        {sortedSegments.map(({ key, count, config }) => {
          const pct = total > 0 ? ((count / total) * 100) : 0
          const SegmentIcon = config.Icon
          return (
            <div key={key} className="flex items-center gap-2">
              <SegmentIcon size={14} weight="duotone" color={config.color} className="flex-shrink-0" />
              <div className="w-24 text-xs text-[var(--text-secondary)] font-medium">{config.label}</div>
              <div className="flex-1 h-5 bg-[var(--bg-input)] rounded-md overflow-hidden">
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
                <span className="text-xs font-semibold text-[var(--text-primary)]">{count.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1">({pct.toFixed(1)}%)</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-default)] text-center">
        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Oportunidad</div>
        <div className="text-sm font-semibold text-[var(--color-success)]">
          {retainablePct}% son retenibles
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          con campanas de reactivacion
        </div>
      </div>
    </AnimatedCard>
  )
}
