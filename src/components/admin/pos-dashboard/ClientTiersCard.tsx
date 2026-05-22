'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { Crown, Medal } from '@phosphor-icons/react'

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  'VIP': { bg: 'var(--color-ak-dorado)', text: '#3E2723' },
  'Oro': { bg: 'var(--color-ak-ambar)', text: '#3E2723' },
  'Plata': { bg: '#9E9E9E', text: '#fff' },
  'Bronce': { bg: 'var(--color-ak-madera)', text: '#F5EDE0' },
}

interface ClientTiersCardProps {
  data: Array<{
    tier: string
    count: number
    totalSpent: number
  }>
}

export function ClientTiersCard({ data }: ClientTiersCardProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Tiers de Clientes</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div>
      <SectionHeading>Tiers de Clientes</SectionHeading>
      <div className="flex flex-wrap gap-2 mt-3">
        {data.map(d => {
          const style = TIER_STYLES[d.tier] || { bg: 'var(--text-secondary)', text: '#fff' }
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
          return (
            <div
              key={d.tier}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: style.bg, color: style.text }}
            >
              {d.tier === 'VIP' ? <Crown size={14} weight="fill" /> : <Medal size={14} weight="fill" />}
              <div>
                <div className="text-xs font-bold">{d.tier}</div>
                <div className="text-[9px] opacity-80">{d.count} ({pct}%) · {formatCOPDisplay(d.totalSpent)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}