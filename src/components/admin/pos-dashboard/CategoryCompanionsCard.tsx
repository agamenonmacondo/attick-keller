'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface CategoryCompanionsCardProps {
  data: Array<{
    cat1Id: string
    cat1Name: string
    cat2Id: string
    cat2Name: string
    sharedCheques: number
  }>
}

export function CategoryCompanionsCard({ data }: CategoryCompanionsCardProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Combinaciones de Categorias</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  const top15 = data.slice(0, 15)

  return (
    <div>
      <SectionHeading>Combinaciones de Categorias</SectionHeading>
      <p className="text-[10px] text-[var(--text-secondary)] mb-2">Pares de categorias que se piden en el mismo cheque</p>
      <div className="overflow-x-auto mt-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria 1</th>
              <th className="text-center py-2 px-1 text-[var(--text-secondary)] font-medium">+</th>
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Categoria 2</th>
              <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Cheques</th>
            </tr>
          </thead>
          <tbody>
            {top15.map((pair, i) => (
              <tr key={`${pair.cat1Id}-${pair.cat2Id}`} className="border-b border-[var(--border-default)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-primary)] font-medium">{pair.cat1Name}</td>
                <td className="py-1.5 px-1 text-center text-[var(--text-secondary)]">+</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{pair.cat2Name}</td>
                <td className="py-1.5 text-right text-[var(--color-ak-borgona)] tabular-nums font-medium">{pair.sharedCheques.toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}