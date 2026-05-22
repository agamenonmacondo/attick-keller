'use client'

import { useState } from 'react'
import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'
import { Users, User, CashRegister } from '@phosphor-icons/react'

type StaffTypeFilter = 'all' | 'waiter' | 'cashier'

interface StaffPerformanceTableProps {
  data: Array<{
    staffId: string
    staffName: string
    staffType: number
    cheques: number
    revenue: number
    propinaTotal: number
    ticketPromedio: number
  }>
  onStaffDrillDown?: (staffId: string, staffName: string) => void
}

const FILTER_TABS: Array<{ key: StaffTypeFilter; label: string; icon?: React.ReactNode }> = [
  { key: 'all', label: 'Todos' },
  { key: 'waiter', label: 'Meseros', icon: <User size={10} /> },
  { key: 'cashier', label: 'Cajeros', icon: <CashRegister size={10} /> },
]

export function StaffPerformanceTable({ data, onStaffDrillDown }: StaffPerformanceTableProps) {
  const [staffFilter, setStaffFilter] = useState<StaffTypeFilter>('all')

  const filteredData = data.filter(s => {
    if (staffFilter === 'waiter') return s.staffType === 1
    if (staffFilter === 'cashier') return s.staffType === 3
    return true
  })

  if (data.length === 0) {
    return (
      <div>
        <SectionHeading>Rendimiento Staff</SectionHeading>
        <p className="text-xs text-[var(--text-secondary)] text-center py-8">Sin datos</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionHeading>Rendimiento Staff</SectionHeading>
        <div className="flex items-center gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStaffFilter(tab.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                staffFilter === tab.key
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] text-center py-6">Sin resultados para este filtro</p>
      ) : (
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 pr-3 text-[var(--text-secondary)] font-medium">Staff</th>
                <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Cheques</th>
                <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Revenue</th>
                <th className="text-right py-2 pr-3 text-[var(--text-secondary)] font-medium">Ticket Prom.</th>
                <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Propinas</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(s => (
                <tr
                  key={s.staffId}
                  className={`border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-input)] ${onStaffDrillDown ? 'cursor-pointer' : ''}`}
                  style={{ transition: 'background 150ms ease-out' }}
                  onClick={onStaffDrillDown ? () => onStaffDrillDown(s.staffId, s.staffName) : undefined}
                  title={onStaffDrillDown ? 'Ver detalle del staff' : undefined}
                >
                  <td className="py-2 pr-3 text-[var(--text-primary)] font-medium">
                    {s.staffName}
                    <span className="ml-1.5 text-[9px] text-[var(--text-secondary)] font-normal">
                      {s.staffType === 1 ? 'Mesero' : s.staffType === 3 ? 'Caja' : ''}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-[var(--text-primary)] tabular-nums">{s.cheques}</td>
                  <td className="py-2 pr-3 text-right text-[var(--text-primary)] tabular-nums font-medium">{formatCOPDisplay(s.revenue)}</td>
                  <td className="py-2 pr-3 text-right text-[var(--text-secondary)] tabular-nums">{formatCOPDisplay(s.ticketPromedio)}</td>
                  <td className="py-2 text-right text-[var(--color-ak-oliva)] tabular-nums">{formatCOPDisplay(s.propinaTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}