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
  { key: 'oneTime' as const, label: '1 Visita', color: 'var(--color-danger)', bg: 'var(--color-danger)' },
  { key: 'twoToThree' as const, label: '2-3 Visitas', color: 'var(--color-warning)', bg: 'var(--color-warning)' },
  { key: 'fourToFive' as const, label: '4-5 Visitas', color: 'var(--color-ak-dorado)', bg: 'var(--color-ak-dorado)' },
  { key: 'sixToTen' as const, label: '6-10 Visitas', color: 'var(--color-success)', bg: 'var(--color-success)' },
  { key: 'vip' as const, label: '11+ VIP', color: 'var(--color-ak-oliva)', bg: 'var(--color-ak-oliva)' },
]

export function RetentionFunnel({ retention, total }: RetentionFunnelProps) {
  const maxVal = Math.max(...STAGES.map(s => retention[s.key] || 0), 1)

  return (
    <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">Embudo de Retencion</h3>
        <span className="text-xs text-[var(--text-secondary)]">{total.toLocaleString()} clientes</span>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((stage) => {
          const value = retention[stage.key] || 0
          const pct = total > 0 ? ((value / total) * 100) : 0
          const barWidth = Math.max((value / maxVal) * 100, 4)

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-20 text-xs text-[var(--text-secondary)] text-right flex-shrink-0">{stage.label}</div>
              <div className="flex-1 h-7 bg-[var(--bg-input)] rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-700 ease-out flex items-center px-2"
                  style={{ width: `${barWidth}%`, backgroundColor: stage.color, opacity: 0.85 }}
                >
                  {pct >= 8 && (
                    <span className="text-[10px] font-semibold text-white">{pct.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="w-16 text-xs font-medium text-[var(--text-primary)] text-right">{value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[var(--color-danger)]">
            {total > 0 ? ((retention.oneTime || 0) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Fuga</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--color-warning)]">
            {total > 0 ? ((retention.twoToThree || 0) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Ocasionales</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--color-success)]">
            {total > 0 ? (((retention.fourToFive || 0) + (retention.sixToTen || 0) + (retention.vip || 0)) / total * 100).toFixed(0) : 0}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Fieles</div>
        </div>
      </div>
    </AnimatedCard>
  )
}