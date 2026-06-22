'use client'

import { useMemo } from 'react'
import { ChartBar } from '@phosphor-icons/react'

interface OperacionHoraChartProps {
  data: { data: any[]; summary: any } | null
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function estadoColor(estado?: string) {
  switch (estado) {
    case 'PICO':
      return { bar: 'rgba(34,197,94,0.85)', dot: 'rgb(34,197,94)' }
    case 'GAP':
      return { bar: 'rgba(196,77,99,0.85)', dot: 'rgb(196,77,99)' }
    case 'SOBRANDO':
      return { bar: 'rgba(234,179,8,0.85)', dot: 'rgb(234,179,8)' }
    default:
      return { bar: 'var(--color-ak-dorado)', dot: 'var(--color-ak-dorado)' }
  }
}

export function OperacionHoraChart({ data }: OperacionHoraChartProps) {
  const { byHour, maxRevenue, maxPersonas } = useMemo(() => {
    const rows = data?.data ?? []
    const map = new Map<number, { revenue: number; personas: number; estado?: string }>()

    for (const r of rows) {
      const h = Number(r.hora)
      if (Number.isNaN(h)) continue
      const cur = map.get(h) ?? { revenue: 0, personas: 0, estado: undefined }
      cur.revenue += Number(r.total_revenue ?? 0)
      cur.personas += Number(r.personas_trabajando ?? 0)
      if (r.estado) cur.estado = r.estado
      map.set(h, cur)
    }

    const hours = Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      revenue: map.get(h)?.revenue ?? 0,
      personas: map.get(h)?.personas ?? 0,
      estado: map.get(h)?.estado,
    }))

    const maxRevenue = Math.max(1, ...hours.map(h => h.revenue))
    const maxPersonas = Math.max(1, ...hours.map(h => h.personas))
    return { byHour: hours, maxRevenue, maxPersonas }
  }, [data])

  const visibleHours = byHour.filter(h => h.revenue > 0)
  const hours = visibleHours.length > 0 ? visibleHours : byHour.filter(h => h.hora >= 12 && h.hora <= 23)

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--color-ak-dorado)]">
          <ChartBar size={16} weight="fill" />
          Operación por Hora
        </h3>
        <span className="text-[10px] text-[var(--text-muted)]" title="PICO = alta demanda vs personal · GAP = falta personal (cocina) · SOBRANDO = sobra personal para el revenue generado · Barras doradas = revenue total · Barras burgundy = personas en turno">
          ¿Qué es esto?
        </span>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'var(--color-ak-dorado)' }} />
            Revenue
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'var(--color-ak-borgona)' }} />
            Personas
          </span>
        </div>
      </div>

      <div className="flex items-end gap-1 h-48 border-b border-[var(--border-default)]">
        {hours.map(h => {
          const revH = (h.revenue / maxRevenue) * 100
          const perH = (h.personas / maxPersonas) * 100
          const col = estadoColor(h.estado)
          const revPerPerson = h.personas > 0 ? h.revenue / h.personas : 0
          return (
            <div key={h.hora} className="flex-1 flex flex-col items-center justify-end group relative min-w-0">
              {/* tooltip */}
              <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg p-2 text-[10px] whitespace-nowrap shadow-lg">
                <div className="font-semibold text-[var(--text-primary)]">{h.hora}:00</div>
                <div className="text-[var(--color-ak-dorado)]">{fmtCOP.format(h.revenue)}</div>
                <div className="text-[var(--color-ak-borgona)]">{h.personas} pers</div>
                {revPerPerson > 0 && <div>${Math.round(revPerPerson).toLocaleString('es-CO')}/p</div>}
                {h.estado && <div style={{ color: col.dot }}>{h.estado}</div>}
              </div>

              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                <div
                  className="w-1/2 rounded-t-sm transition-all"
                  style={{ height: `${revH}%`, background: col.bar, minHeight: h.revenue > 0 ? 2 : 0 }}
                />
                <div
                  className="w-1/2 rounded-t-sm transition-all"
                  style={{ height: `${perH}%`, background: 'var(--color-ak-borgona)', minHeight: h.personas > 0 ? 2 : 0 }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 mt-1">
        {hours.map(h => (
          <div key={h.hora} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
            {h.hora}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-3 text-[10px]">
        {(['PICO', 'GAP', 'SOBRANDO'] as const).map(e => (
          <span key={e} className="flex items-center gap-1 text-[var(--text-muted)]">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: estadoColor(e).dot }} />
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}