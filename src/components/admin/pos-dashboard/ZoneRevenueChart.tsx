'use client'

import { SectionHeading } from '../shared/SectionHeading'
import { formatCOPDisplay } from './KPICard'

const ZONE_COLORS: Record<string, string> = {
  'Tipi': 'var(--color-ak-madera)',
  'Attic': 'var(--color-ak-borgona)',
  'Chispas': 'var(--color-ak-ambar)',
  'Llevar': 'var(--color-ak-oliva)',
  'Interno': 'var(--color-ak-dorado)',
  'Keller': 'var(--color-ak-cal)',
}

interface ZoneRevenueChartProps {
  data: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
  }>
  selectedZone: string
  onZoneClick: (zone: string) => void
  onZoneDrillDown?: (zoneName: string) => void
  unknownZone?: { revenue: number; cheques: number; pct: number }
}

export function ZoneRevenueChart({ data, selectedZone, onZoneClick, onZoneDrillDown, unknownZone }: ZoneRevenueChartProps) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="min-h-[200px]">
      <SectionHeading>Revenue por Zona</SectionHeading>
      <div className="space-y-2.5 mt-3">
        {data.map(d => {
          const widthPct = (d.revenue / maxRevenue) * 100
          const isSelected = selectedZone === d.zone
          const isAllSelected = selectedZone === 'all'
          const color = ZONE_COLORS[d.zone] || 'var(--text-secondary)'
          const opacity = isAllSelected || isSelected ? 1 : 0.35

          return (
            <div key={d.zone} className="w-full group">
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => onZoneClick(isSelected ? 'all' : d.zone)}
                  className={`text-xs font-medium ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                  style={{ transition: 'color 150ms ease-out' }}
                >
                  {d.zone}
                </button>
                <span className="text-[9px] text-[var(--text-secondary)]">{d.pct}%</span>
                <span
                  className={`ml-auto text-xs font-mono tabular-nums ${onZoneDrillDown ? 'cursor-pointer hover:text-[var(--color-ak-borgona)]' : 'text-[var(--text-primary)]'}`}
                  style={{ transition: 'color 150ms ease-out' }}
                  onClick={onZoneDrillDown ? () => onZoneDrillDown(d.zone) : undefined}
                  title={onZoneDrillDown ? 'Ver detalle de zona' : undefined}
                >
                  {formatCOPDisplay(d.revenue)}
                </span>
              </div>
              <div
                className={`h-4 bg-[var(--bg-input)] rounded overflow-hidden ${onZoneDrillDown ? 'cursor-pointer' : ''}`}
                onClick={onZoneDrillDown ? () => onZoneDrillDown(d.zone) : undefined}
                title={onZoneDrillDown ? 'Ver detalle de zona' : undefined}
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    opacity,
                    transition: 'width 500ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease-out',
                  }}
                />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[9px] text-[var(--text-secondary)]">{d.cheques} cheques</span>
                <span className="text-[9px] text-[var(--text-secondary)]">Ticket: {formatCOPDisplay(d.ticketPromedio)}</span>
                <span className="text-[9px] text-[var(--text-secondary)]">Propina: {formatCOPDisplay(d.propinaTotal)}</span>
              </div>
            </div>
          )
        })}
        {data.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)] text-center py-4">Sin datos</p>
        )}
        {unknownZone && unknownZone.revenue > 0 && (
          <div className="mt-2 px-2 py-1.5 rounded bg-[var(--bg-input)] border border-[var(--border-default)]">
            <p className="text-[10px] text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{unknownZone.pct}%</span> de ventas sin zona asignada: <span className="font-mono tabular-nums">{formatCOPDisplay(unknownZone.revenue)}</span> ({unknownZone.cheques} cheques)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}