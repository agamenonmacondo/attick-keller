'use client'

import { useState } from 'react'
import type { useRodriData } from '@/lib/hooks/useRodriData'
import { calcHours, calcCost, formatCOP } from '@/lib/hooks/useRodriData'

type Data = ReturnType<typeof useRodriData>

const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
const OFF_CODES = ['X', 'VAC', 'INC', 'FEST', '']

const TURNO_STYLE: Record<string, string> = {
  A: 'bg-[var(--color-ak-verde)]/15 text-[var(--color-ak-verde)]',
  P1: 'bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-borgona)]',
  P2: 'bg-[var(--color-ak-dorado)]/15 text-[var(--color-ak-dorado)]',
  S: 'bg-[var(--color-ak-ambar)]/15 text-[var(--color-ak-ambar)]',
  C: 'bg-[var(--color-ak-madera)]/15 text-[var(--color-ak-madera)]',
  CD: 'bg-[var(--color-ak-ambar)]/15 text-[var(--color-ak-ambar)]',
  CS: 'bg-[var(--color-ak-verde)]/15 text-[var(--color-ak-verde)]',
}

export function EquiposDiariosTab({ data }: { data: Data }) {
  const weeks = [...new Set(data.schedules.map(s => s.week_str))].sort()
  const [week, setWeek] = useState(weeks.length > 1 ? weeks[1] : weeks[0] || '')
  const empMap = new Map(data.employees.map(e => [e.id, e]))

  const weekScheds = data.schedules.filter(s => s.week_str === week)

  return (
    <div>
      {/* Week selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              week === w
                ? 'bg-[var(--color-ak-borgona)] text-[var(--color-ak-dorado)]'
                : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-ak-borgona)]'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Daily views */}
      {DAY_FULL.map((dayName, di) => {
        const dayData = weekScheds.filter(s => s.day_index === di)
        const working = dayData.filter(s => !OFF_CODES.includes(s.turno))
        const off = dayData.filter(s => OFF_CODES.includes(s.turno) && s.turno)
        const isDom = di === 0
        const totalH = working.reduce((sum, s) => sum + calcHours(s.entrada, s.salida, s.day_index).total, 0)
        const totalC = working.reduce((sum, s) => sum + calcCost(calcHours(s.entrada, s.salida, s.day_index)), 0)

        // Group by team
        const byTeam: Record<string, typeof working> = {}
        working.forEach(s => {
          const emp = empMap.get(s.employee_id)
          const team = emp?.team || 'Sin team'
          if (!byTeam[team]) byTeam[team] = []
          byTeam[team].push(s)
        })

        return (
          <div key={di} className="mb-6">
            <div className={`flex items-baseline gap-2 mb-2 ${isDom ? 'text-[var(--color-ak-borgona)]' : 'text-[var(--text-primary)]'}`}>
              <h3 className="text-sm font-semibold">{dayName}{isDom ? ' [DOMINGO]' : ''}</h3>
              <span className="text-xs text-[var(--text-secondary)]">{working.length} personas | {totalH.toFixed(0)}h | {formatCOP(totalC)}</span>
            </div>

            {Object.keys(byTeam).length === 0 && working.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] p-3">Sin personal asignado</p>
            )}

            {Object.entries(byTeam).sort().map(([team, members]) => (
              <div key={team} className="mb-2">
                <p className="text-xs font-semibold text-[var(--color-ak-borgona)] uppercase tracking-wide mb-1">{team}</p>
                <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        <th className="text-left py-1.5 px-2 text-xs text-[var(--text-secondary)]">Empleado</th>
                        <th className="text-left py-1.5 px-2 text-xs text-[var(--text-secondary)]">Cargo</th>
                        <th className="text-center py-1.5 px-2 text-xs text-[var(--text-secondary)]">Turno</th>
                        <th className="text-left py-1.5 px-2 text-xs text-[var(--text-secondary)]">Horario</th>
                        <th className="text-right py-1.5 px-2 text-xs text-[var(--text-secondary)]">Horas</th>
                        <th className="text-right py-1.5 px-2 text-xs text-[var(--text-secondary)]">RN</th>
                        <th className="text-right py-1.5 px-2 text-xs text-[var(--text-secondary)]">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.sort((a, b) => (a.entrada || '99').localeCompare(b.entrada || '99')).map(s => {
                        const emp = empMap.get(s.employee_id)
                        const h = calcHours(s.entrada, s.salida, s.day_index)
                        const c = calcCost(h)
                        return (
                          <tr key={s.id} className="border-b border-[var(--border-default)]/30 hover:bg-[var(--bg-hover)]/50">
                            <td className="py-1.5 px-2 font-medium text-[var(--text-primary)]">{emp?.nombre || '?'}</td>
                            <td className="py-1.5 px-2 text-[var(--text-secondary)]">{emp?.cargo || '?'}</td>
                            <td className="py-1.5 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TURNO_STYLE[s.turno] || 'bg-[var(--border-default)]/30 text-[var(--text-secondary)]'}`}>{s.turno}</span></td>
                            <td className="py-1.5 px-2 text-[var(--text-secondary)] tabular-nums">{s.entrada}-{s.salida}</td>
                            <td className="py-1.5 px-2 text-right tabular-nums">{h.total.toFixed(1)}h</td>
                            <td className="py-1.5 px-2 text-right tabular-nums text-[var(--text-secondary)]">{h.rn.toFixed(1)}h</td>
                            <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[var(--color-ak-borgona)]">{formatCOP(c)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {off.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">Fuera: {off.map(s => { const emp = empMap.get(s.employee_id); return `${emp?.nombre || '?'}(${s.turno})`; }).join(', ')}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}