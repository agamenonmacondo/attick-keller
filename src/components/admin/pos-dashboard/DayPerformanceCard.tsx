'use client'

import { AnimatedCounter } from '../shared/AnimatedCounter'
import { SectionHeading } from '../shared/SectionHeading'
import { TrendUp, TrendDown } from '@phosphor-icons/react'

interface DayPerformanceProps {
  date: string
  kpis: {
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    personas: number
  }
  byZone: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
  }>
  topProducts: Array<{
    productName: string
    category: string
    quantity: number
    revenue: number
  }>
  hourlyRevenue: Array<{
    hour: string
    revenue: number
    cheques: number
  }>
  staffPerformance: Array<{
    staffName: string
    cheques: number
    revenue: number
    propinaTotal: number
  }>
}

const ZONE_COLORS: Record<string, string> = {
  'Tipi': '#6B2737',
  'Attic': '#5C7A4D',
  'Chispas': '#D4922A',
}

function formatCOP(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `$${abs.toLocaleString('es-CO')}`
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

export function DayPerformanceCard({ date, kpis, byZone, topProducts, hourlyRevenue, staffPerformance }: DayPerformanceProps) {
  const maxHourRevenue = Math.max(...hourlyRevenue.map(h => h.revenue), 1)
  const top5 = topProducts.slice(0, 5)
  const top5Staff = staffPerformance.slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading>Desempeno del dia</SectionHeading>
        <span className="text-xs font-semibold text-[var(--color-ak-borgona)]">
          {formatDateLabel(date)}
        </span>
      </div>

      {/* KPIs del dia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Revenue', value: formatCOP(kpis.revenue) },
          { label: 'Cheques', value: kpis.cheques.toString() },
          { label: 'Ticket prom.', value: formatCOP(kpis.ticketPromedio) },
          { label: 'Propinas', value: formatCOP(kpis.propinaTotal) },
          { label: 'Personas', value: kpis.personas.toString() },
        ].map((kpi, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{kpi.label}</div>
            <div className="text-sm font-bold text-[var(--text-primary)]">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Zona breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Por zona</h4>
          <div className="space-y-2">
            {byZone.map(z => {
              const color = ZONE_COLORS[z.zone] || '#C9A94E'
              return (
                <div key={z.zone} className="flex items-center gap-2">
                  <div
                    className="h-6 rounded-md flex items-center px-2 text-[11px] font-medium text-white shrink-0"
                    style={{ backgroundColor: color, minWidth: '60px' }}
                  >
                    {z.zone}
                  </div>
                  <div className="flex-1 text-[11px]">
                    <span className="font-semibold text-[var(--text-primary)]">{formatCOP(z.revenue)}</span>
                    <span className="text-[var(--text-secondary)] ml-1.5">{z.cheques} cheques</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">{z.pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top 5 productos del dia */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Top productos</h4>
          <div className="space-y-1.5">
            {top5.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-[var(--text-secondary)] text-right shrink-0">{i + 1}.</span>
                <span className="text-[var(--text-primary)] font-medium truncate flex-1">{p.productName}</span>
                <span className="text-[var(--text-secondary)] shrink-0">{Math.round(Number(p.quantity))} uds</span>
                <span className="font-semibold text-[var(--text-primary)] shrink-0">{formatCOP(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 meseros del dia */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Meseros</h4>
          <div className="space-y-1.5">
            {top5Staff.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-[var(--text-secondary)] text-right shrink-0">{i + 1}.</span>
                <span className="text-[var(--text-primary)] font-medium truncate flex-1">{s.staffName}</span>
                <span className="text-[var(--text-secondary)] shrink-0">{s.cheques}</span>
                <span className="font-semibold text-[var(--text-primary)] shrink-0">{formatCOP(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horas del dia - mini chart */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Hora a hora</h4>
        <div className="flex items-end gap-[3px] h-16">
          {hourlyRevenue.map(h => {
            const pct = (h.revenue / maxHourRevenue) * 100
            const isPeak = h.revenue === maxHourRevenue
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5 min-w-[18px]">
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${isPeak ? 'bg-[var(--color-ak-borgona)]' : 'bg-[var(--color-ak-borgona)]/30'}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                  title={`${h.hour}:00 - ${formatCOP(h.revenue)} (${h.cheques} cheques)`}
                />
                <span className="text-[8px] text-[var(--text-secondary)]">{h.hour}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}