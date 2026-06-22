'use client'

import { useMemo } from 'react'
import { ChartLineUp, Trophy, WarningCircle } from '@phosphor-icons/react'

interface ProductividadAreaRadarProps {
  data: { data: any[]; summary: any } | null
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function roiColor(roi: number) {
  if (roi > 3) return { text: 'rgb(34,197,94)', bg: 'rgba(34,197,94,0.12)' }
  if (roi >= 1) return { text: 'rgb(234,179,8)', bg: 'rgba(234,179,8,0.12)' }
  return { text: 'rgb(196,77,99)', bg: 'rgba(196,77,99,0.12)' }
}

export function ProductividadAreaRadar({ data }: ProductividadAreaRadarProps) {
  const { rows, summary } = useMemo(() => {
    const raw = data?.data ?? []
    const map = new Map<string, {
      revenue: number; horas: number; costo: number; n: number
    }>()

    for (const r of raw) {
      const a = r.area ?? 'Sin área'
      const cur = map.get(a) ?? { revenue: 0, horas: 0, costo: 0, n: 0 }
      cur.revenue += Number(r.revenue ?? 0)
      cur.horas += Number(r.horas_turno ?? 0)
      cur.costo += Number(r.costo_turnos ?? 0)
      cur.n += 1
      map.set(a, cur)
    }

    const rows = Array.from(map.entries()).map(([area, v]) => {
      const revPerHour = v.horas > 0 ? v.revenue / v.horas : 0
      const costPerHour = v.horas > 0 ? v.costo / v.horas : 0
      const roi = v.costo > 0 ? v.revenue / v.costo : 0
      return { area, revenue: v.revenue, horas: v.horas, revPerHour, costPerHour, roi }
    }).sort((a, b) => b.roi - a.roi)

    return { rows, summary: data?.summary }
  }, [data])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
        Sin datos de productividad por área.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ak-dorado)]">
          <ChartLineUp size={16} weight="fill" />
          Productividad por Área
        </h3>
        {summary && (
          <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Trophy size={12} className="text-[var(--color-ak-dorado)]" weight="fill" />
              Mejor: <strong className="text-[var(--text-primary)]">{summary.mejor_area || '—'}</strong>
            </span>
            <span className="flex items-center gap-1">
              <WarningCircle size={12} className="text-[var(--color-ak-borgona)]" />
              Peor: <strong className="text-[var(--text-primary)]">{summary.peor_area || '—'}</strong>
            </span>
            <span>ROI prom: <strong className="text-[var(--text-primary)]">{Number(summary.roi_promedio ?? 0).toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="py-2 pr-3 font-medium uppercase tracking-wide">Área</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Revenue</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Horas turno</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Rev/hora</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Costo/hora</th>
            <th className="py-2 pl-2 font-medium uppercase tracking-wide text-right">ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const c = roiColor(r.roi)
            return (
              <tr
                key={r.area}
                className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-input)]/40"
              >
                <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{r.area}</td>
                <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtCOP.format(r.revenue)}</td>
                <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{r.horas.toFixed(1)}</td>
                <td className="py-2 px-2 text-right text-[var(--color-ak-dorado)]">{fmtCOP.format(r.revPerHour)}</td>
                <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{fmtCOP.format(r.costPerHour)}</td>
                <td className="py-2 pl-2 text-right">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ color: c.text, background: c.bg }}
                  >
                    {r.roi.toFixed(2)}x
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}