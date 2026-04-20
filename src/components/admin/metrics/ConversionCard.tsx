'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface ConversionCardProps { pending: number; confirmed: number; rate: number }

export function ConversionCard({ pending, confirmed, rate }: ConversionCardProps) {
  const total = pending + confirmed
  const confirmedPct = total > 0 ? (confirmed / total) * 100 : 0

  return (
    <div className="p-5">
      <SectionHeading>Tasa de conversion</SectionHeading>
      <div className="flex items-end gap-1 mt-2">
        <AnimatedCounter value={rate} className="text-4xl font-['Playfair_Display'] font-bold text-[#3E2723]" />
        <span className="text-lg text-[#8D6E63] mb-1">%</span>
      </div>
      <p className="text-xs text-[#8D6E63] mt-1">{confirmed} confirmadas de {total} reservas</p>
      <div className="flex h-2 bg-[#EFEBE9] rounded-full overflow-hidden mt-3">
        <div className="h-full bg-[#5C7A4D] rounded-full" style={{ width: `${confirmedPct}%`, transition: 'width 500ms ease-out' }} />
        <div className="h-full bg-amber-400" style={{ width: `${100 - confirmedPct}%`, transition: 'width 500ms ease-out' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#5C7A4D]">Confirmadas</span>
        <span className="text-[9px] text-amber-600">Pendientes</span>
      </div>
    </div>
  )
}