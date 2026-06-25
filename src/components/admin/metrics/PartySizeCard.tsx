'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { AnimatedCounter } from '../shared/AnimatedCounter'

interface PartySizeCardProps { average: number }

export function PartySizeCard({ average }: PartySizeCardProps) {
  return (
    <div className="p-5">
      <SectionHeading>Promedio de personas</SectionHeading>
      <div className="flex items-end gap-1 mt-2">
        <AnimatedCounter value={average} className="text-4xl font-[family-name:var(--font-heading)] font-bold text-[var(--text-primary)]" />
        <span className="text-lg text-[var(--text-secondary)] mb-1">p</span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-1">Promedio por reserva — ultimos 30 dias</p>
    </div>
  )
}