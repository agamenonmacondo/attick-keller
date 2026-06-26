'use client'

import { useMemo } from 'react'
import { ClockAfternoon, MoonStars } from '@phosphor-icons/react'

interface RecargosNominaGridProps {
  dataHorasExtra: { data: any[]; summary: any } | null
  dataHorasNocturnas: { data: any[]; summary: any } | null
}

const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const fmtNum = (n: number, d = 1) => n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })

interface Row {
  key: string
  nombre: string
  area: string
  he: number
  costoHE: number
  nocturnas: number
  recargoNocturno: number
}

export function RecargosNominaGrid({ dataHorasExtra, dataHorasNocturnas }: RecargosNominaGridProps) {
  const { rows, totals } = useMemo(() => {
    const heRows = dataHorasExtra?.data ?? []
    const noctRows = dataHorasNocturnas?.data ?? []

    const map = new Map<string, Row>()

    // Index by empleado_nombre only (merge across days)
    for (const r of heRows) {
      const key = r.empleado_nombre ?? 'Sin nombre'
      const cur = map.get(key) ?? {
        key,
        nombre: key,
        area: r.area ?? '—',
        he: 0,
        costoHE: 0,
        nocturnas: 0,
        recargoNocturno: 0,
      }
      cur.he += Number(r.horas_extra ?? 0)
      cur.costoHE += Number(r.costo_he ?? 0)
      map.set(key, cur)
    }

    for (const r of noctRows) {
      const key = r.empleado_nombre ?? 'Sin nombre'
      const cur = map.get(key) ?? {
        key,
        nombre: key,
        area: r.area ?? '—',
        he: 0,
        costoHE: 0,
        nocturnas: 0,
        recargoNocturno: 0,
      }
      cur.nocturnas += Number(r.horas_nocturnas ?? 0)
      cur.recargoNocturno += Number(r.recargo_35pct ?? 0)
      map.set(key, cur)
    }

    const rows = Array.from(map.values()).filter(r => r.he > 0 || r.nocturnas > 0)
    const totals = rows.reduce(
      (acc, r) => {
        acc.he += r.he
        acc.costoHE += r.costoHE
        acc.nocturnas += r.nocturnas
        acc.recargoNocturno += r.recargoNocturno
        return acc
      },
      { he: 0, costoHE: 0, nocturnas: 0, recargoNocturno: 0 },
    )

    return { rows, totals }
  }, [dataHorasExtra, dataHorasNocturnas])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
        Sin recargos registrados en este período.
      </div>
    )
  }

  const totalRecargos = totals.costoHE + totals.recargoNocturno

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-[var(--color-ak-dorado)]">
        <ClockAfternoon size={16} weight="fill" />
        Recargos de Nómina
      </h3>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">
        HE = horas extra (recargo 25%/75%/100% según día y hora) · Nocturnas = horas 21:00-06:00 (recargo 35%) · Total = costo HE + recargo nocturno
      </p>

      <table className="w-full text-xs min-w-[680px]">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-default)]">
            <th className="py-2 pr-3 font-medium uppercase tracking-wide">Empleado</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide">Área</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">HE</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Costo HE</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Nocturnas</th>
            <th className="py-2 px-2 font-medium uppercase tracking-wide text-right">Recargo noct.</th>
            <th className="py-2 pl-2 font-medium uppercase tracking-wide text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.key}
              className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-input)]/40"
            >
              <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">{r.nombre}</td>
              <td className="py-2 px-2 text-[var(--text-secondary)]">{r.area}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtNum(r.he)}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtCOP.format(r.costoHE)}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtNum(r.nocturnas)}</td>
              <td className="py-2 px-2 text-right text-[var(--text-primary)]">{fmtCOP.format(r.recargoNocturno)}</td>
              <td className="py-2 pl-2 text-right font-semibold text-[var(--color-ak-dorado)]">
                {fmtCOP.format(r.costoHE + r.recargoNocturno)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-[var(--text-primary)]">
            <td className="py-2 pr-3" colSpan={2}>Totales</td>
            <td className="py-2 px-2 text-right">{fmtNum(totals.he)}</td>
            <td className="py-2 px-2 text-right">{fmtCOP.format(totals.costoHE)}</td>
            <td className="py-2 px-2 text-right">{fmtNum(totals.nocturnas)}</td>
            <td className="py-2 px-2 text-right">{fmtCOP.format(totals.recargoNocturno)}</td>
            <td className="py-2 pl-2 text-right text-[var(--color-ak-dorado)]">
              {fmtCOP.format(totalRecargos)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="flex items-center gap-2 mt-3 text-[11px] text-[var(--text-muted)]">
        <MoonStars size={14} className="text-[var(--color-ak-borgona)]" />
        Recargo nocturno calculado sobre horas 21:00–06:00.
      </div>
    </div>
  )
}