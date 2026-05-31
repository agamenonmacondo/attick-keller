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

  return (
    <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide uppercase">Riesgo No-Show</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-medium">
          {totalNoShows.toLocaleString()} no-shows
        </span>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Sin riesgo', count: risk.noRisk, color: 'var(--color-success)', bg: 'var(--color-success)' },
          { label: 'Riesgo bajo (1)', count: risk.lowRisk, color: 'var(--color-warning)', bg: 'var(--color-warning)' },
          { label: 'Riesgo medio (2-3)', count: risk.medRisk, color: 'var(--color-ak-ladrillo)', bg: 'var(--color-ak-ladrillo)' },
          { label: 'Riesgo alto (4+)', count: risk.highRisk, color: 'var(--color-danger)', bg: 'var(--color-danger)' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-28 text-xs text-[var(--text-secondary)] flex-shrink-0">{label}</div>
            <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: `color-mix(in srgb, ${bg} 15%, var(--bg-input))` }}>
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${Math.max((count / total) * 100, 2)}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="w-14 text-xs font-medium text-right text-[var(--text-primary)]">{count.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-bold text-[var(--color-danger)]">{risk.highRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Alto riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[var(--color-ak-ladrillo)]">{risk.medRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Medio riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[var(--color-success)]">{risk.lowRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Bajo riesgo</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-[var(--color-ak-oliva)]">{risk.noRisk.toLocaleString()}</div>
          <div className="text-[10px] text-[var(--text-muted)]">Sin riesgo</div>
        </div>
      </div>
    </AnimatedCard>
  )
}