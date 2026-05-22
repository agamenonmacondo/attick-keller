'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { User, Users } from '@phosphor-icons/react'

interface ClientSplitCardProps {
  data: {
    consumidorFinal: { cheques: number; revenue: number }
    identificados: { cheques: number; revenue: number }
  }
}

export function ClientSplitCard({ data }: ClientSplitCardProps) {
  const total = data.consumidorFinal.cheques + data.identificados.cheques
  const cfPct = total > 0 ? Math.round((data.consumidorFinal.cheques / total) * 100) : 0
  const idPct = total > 0 ? 100 - cfPct : 0

  return (
    <div>
      <SectionHeading>Clientes Identificados vs Consumidor Final</SectionHeading>
      <div className="flex gap-4 mt-3">
        <div className="flex-1 bg-[var(--bg-input)] rounded-lg p-3 flex items-center gap-3">
          <User size={20} weight="regular" className="text-[var(--text-secondary)] shrink-0" />
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{cfPct}%</div>
            <div className="text-[9px] text-[var(--text-secondary)]">Consumidor Final</div>
            <div className="text-[10px] text-[var(--text-secondary)] tabular-nums">{data.consumidorFinal.cheques} cheques · {formatCOPDisplay(data.consumidorFinal.revenue)}</div>
          </div>
        </div>
        <div className="flex-1 bg-[var(--bg-input)] rounded-lg p-3 flex items-center gap-3">
          <Users size={20} weight="regular" className="text-[var(--color-ak-oliva)] shrink-0" />
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{idPct}%</div>
            <div className="text-[9px] text-[var(--text-secondary)]">Identificados</div>
            <div className="text-[10px] text-[var(--text-secondary)] tabular-nums">{data.identificados.cheques} cheques · {formatCOPDisplay(data.identificados.revenue)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}