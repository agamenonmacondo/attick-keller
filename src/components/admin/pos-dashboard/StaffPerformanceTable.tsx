'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

interface StaffPerformanceTableProps {
  data: Array<{
    staffId: string
    staffName: string
    cheques: number
    revenue: number
    propinaTotal: number
    ticketPromedio: number
  }>
}

export function StaffPerformanceTable({ data }: StaffPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Rendimiento Meseros</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Rendimiento Meseros</SectionHeading>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Mesero</th>
              <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Cheques</th>
              <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Revenue</th>
              <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Ticket Prom.</th>
              <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Propinas</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.staffId} className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-input)]" style={{ transition: 'background 150ms ease-out' }}>
                <td className="py-2 pr-3 text-[var(--text-primary)] font-medium">{s.staffName}</td>
                <td className="py-2 pr-3 text-right text-[var(--text-primary)] tabular-nums">{s.cheques}</td>
                <td className="py-2 pr-3 text-right text-[var(--text-primary)] tabular-nums font-medium">{formatCOPDisplay(s.revenue)}</td>
                <td className="py-2 pr-3 text-right text-[var(--text-secondary)] tabular-nums">{formatCOPDisplay(s.ticketPromedio)}</td>
                <td className="py-2 text-right text-[var(--color-ak-oliva)] tabular-nums">{formatCOPDisplay(s.propinaTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}