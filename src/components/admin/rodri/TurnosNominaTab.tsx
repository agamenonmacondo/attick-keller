'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { useRodriData } from '@/lib/hooks/useRodriData'
import { calcHours, calcCost, formatCOP } from '@/lib/hooks/useRodriData'

type Data = ReturnType<typeof useRodriData>

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const OFF_CODES = ['X', 'VAC', 'INC', 'FEST', '']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtTooltip = (v: any) => typeof v === 'number' ? formatCOP(v) : String(v ?? '')

const TURNO_STYLE: Record<string, string> = {
  A: 'bg-[var(--color-ak-verde)]/15 text-[var(--color-ak-verde)] dark:bg-[var(--color-ak-verde)]/20 dark:text-[var(--color-ak-verde)]',
  P1: 'bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]/15 dark:text-[var(--color-ak-borgona-light)]',
  P2: 'bg-[var(--color-ak-dorado)]/15 text-[var(--color-ak-dorado)] dark:bg-[var(--color-ak-dorado)]/20 dark:text-[var(--color-ak-dorado)]',
  S: 'bg-[var(--color-ak-ambar)]/15 text-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar)]/20 dark:text-[var(--color-ak-ambar)]',
  C: 'bg-[var(--color-ak-madera)]/15 text-[var(--color-ak-madera)] dark:bg-[var(--color-ak-madera)]/20 dark:text-[var(--color-ak-madera)]',
  CD: 'bg-[var(--color-ak-ambar)]/15 text-[var(--color-ak-ambar)] dark:bg-[var(--color-ak-ambar)]/20 dark:text-[var(--color-ak-ambar)]',
  CS: 'bg-[var(--color-ak-verde)]/15 text-[var(--color-ak-verde)] dark:bg-[var(--color-ak-verde)]/20 dark:text-[var(--color-ak-verde)]',
}

export function TurnosNominaTab({ data }: { data: Data }) {
  const weeks = [...new Set(data.schedules.map(s => s.week_str))].sort()
  const [week, setWeek] = useState(weeks.length > 1 ? weeks[1] : weeks[0] || '')
  const empMap = new Map(data.employees.map(e => [e.id, e]))

  const weekScheds = data.schedules.filter(s => s.week_str === week)
  const workScheds = weekScheds.filter(s => !OFF_CODES.includes(s.turno))

  // Hours & cost per day for charts
  const chartData = DAY_NAMES.map((d, i) => {
    const day = workScheds.filter(s => s.day_index === i)
    const horas = day.reduce((sum, s) => sum + calcHours(s.entrada, s.salida, s.day_index).total, 0)
    const costo = day.reduce((sum, s) => sum + calcCost(calcHours(s.entrada, s.salida, s.day_index)), 0)
    return { dia: d, Horas: Math.round(horas * 10) / 10, Costo: costo }
  })

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
                ? 'bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-borgona-light)] dark:text-[var(--color-ak-madera)]'
                : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-ak-borgona)] dark:hover:border-[var(--color-ak-borgona-light)]'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Turnos catalog */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 mb-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Catalogo de Turnos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Codigo</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Nombre</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Horario</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Duracion</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {data.turnosConfig.filter((t, i, arr) => arr.findIndex(x => x.code === t.code) === i).map(t => {
              const dur = t.entrada && t.salida && t.entrada !== '-'
                ? (() => {
                    const [hE, mE] = t.entrada!.split(':').map(Number)
                    const [hS, mS] = t.salida!.split(':').map(Number)
                    let fin = hS * 60 + mS, ini = hE * 60 + mE
                    if (fin <= ini) fin += 1440
                    return ((fin - ini) / 60).toFixed(1) + 'h'
                  })()
                : '-'
              const tipo = OFF_CODES.includes(t.code) ? 'Descanso' : ['A', 'P1', 'P2', 'S'].includes(t.code) ? 'Trabajo' : 'Cierre'
              return (
                <tr key={t.id} className="border-b border-[var(--border-default)]/50">
                  <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${TURNO_STYLE[t.code] || 'bg-[var(--border-default)] text-[var(--text-secondary)]'}`}>{t.code}</span></td>
                  <td className="py-2 px-2 text-[var(--text-primary)]">{t.name}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{t.entrada || '-'} - {t.salida || '-'}</td>
                  <td className="py-2 px-2 tabular-nums">{dur}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{tipo}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Schedule matrix */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 mb-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Matriz Semanal — {week}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Empleado</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Cargo</th>
              <th className="text-left py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Team</th>
              {DAY_NAMES.map(d => <th key={d} className="text-center py-2 px-1 text-xs text-[var(--text-secondary)] uppercase">{d}</th>)}
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Horas</th>
              <th className="text-right py-2 px-2 text-xs text-[var(--text-secondary)] uppercase">Costo</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map(emp => {
              const empScheds = weekScheds.filter(s => s.employee_id === emp.id)
              if (empScheds.length === 0) return null
              let totalHoras = 0, totalCosto = 0
              const cells = DAY_NAMES.map((_, di) => {
                const s = empScheds.find(s => s.day_index === di)
                if (!s) return <td key={di} className="py-1.5 px-1 text-center text-[var(--border-default)]">-</td>
                if (OFF_CODES.includes(s.turno)) return <td key={di} className="py-1.5 px-1 text-center"><span className="px-1.5 py-0.5 rounded text-xs bg-[var(--border-default)]/30 text-[var(--text-secondary)]">{s.turno}</span></td>
                const h = calcHours(s.entrada, s.salida, s.day_index)
                const c = calcCost(h)
                totalHoras += h.total
                totalCosto += c
                const isDom = di === 0
                const style = TURNO_STYLE[s.turno] || 'bg-[var(--border-default)]/30 text-[var(--text-secondary)]'
                return (
                  <td key={di} className="py-1.5 px-1 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${isDom ? 'bg-[var(--color-ak-borgona)]/20 text-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]/20 dark:text-[var(--color-ak-borgona-light)]' : style}`}>
                      {s.turno}
                    </span>
                  </td>
                )
              })
              return (
                <tr key={emp.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/50">
                  <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{emp.nombre}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{emp.cargo}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{emp.team}</td>
                  {cells}
                  <td className="py-2 px-2 text-right tabular-nums font-medium text-[var(--text-primary)]">{totalHoras.toFixed(1)}h</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatCOP(totalCosto)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Horas por Dia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="dia" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Horas" fill="var(--color-ak-borgona)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Costo por Dia (COP)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="dia" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : ''} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip formatter={fmtTooltip} />
              <Bar dataKey="Costo" fill="var(--color-ak-verde)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}