'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface NoShowCardProps { total: number; noShows: number; rate: number }

export function NoShowCard({ total, noShows, rate }: NoShowCardProps) {
  return (
    <div className="p-5">
      <SectionHeading>Tasa de no-asistencia</SectionHeading>
      <div className="flex items-end gap-1 mt-2">
        <AnimatedCounter value={rate} className="text-4xl font-['Playfair_Display'] font-bold text-[#3E2723]" />
        <span className="text-lg text-[#8D6E63] mb-1">%</span>
      </div>
      <p className="text-xs text-[#8D6E63] mt-1">{noShows} no asistieron de {total} completadas</p>
      <div className="flex items-center gap-1 mt-3">
        <span className="w-2 h-2 rounded-full bg-zinc-700" />
        <span className="text-[10px] text-[#8D6E63]">No-show rate — ultimos 30 dias</span>
      </div>
    </div>
  )
}