'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface PartySizeCardProps { average: number }

export function PartySizeCard({ average }: PartySizeCardProps) {
  return (
    <div className="p-5">
      <SectionHeading>Promedio de personas</SectionHeading>
      <div className="flex items-end gap-1 mt-2">
        <AnimatedCounter value={average} className="text-4xl font-['Playfair_Display'] font-bold text-[#3E2723]" />
        <span className="text-lg text-[#8D6E63] mb-1">p</span>
      </div>
      <p className="text-xs text-[#8D6E63] mt-1">Promedio por reserva — ultimos 30 dias</p>
    </div>
  )
}