'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRodriData } from '@/lib/hooks/useRodriData'

// ── Types ──
interface SimConfig {
  teamMinCovers: Record<string, Record<number, number>> // team -> dayOfWeek(0-6) -> min staff
  shiftPreferences: Record<string, string[]> // team -> preferred shift codes
  maxHoursPerWeek: number
  maxDaysPerWeek: number
  maxSplitShifts: number
  overtimeMultiplier: number
}

interface SimResult {
  employee: string
  team: string
  cargo: string
  weeklyHours: number
  overtimeHours: number
  nightHours: number
  splitShifts: number
  daysWorked: number
  cost: number // estimated cost with recargos
}

interface DaySlot {
  day: number
  dayName: string
  shiftCode: string
  entrada: string
  salida: string
  hours: number
  isNight: boolean
  isSplit: boolean
  isSunday: boolean
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const TEAM_COLORS: Record<string, string> = {
  'Cocina': 'var(--color-danger)',
  'Pizzeria': 'var(--color-ak-ambar)',
  'Servicio': 'var(--color-ak-borgona)',
  'Ático - barra': 'var(--color-ak-dorado)',
  'keller - barra': 'var(--color-danger)',
  'Taller - barra': 'var(--color-ak-oliva)',
}

const SHIFT_DEFS: Record<string, { name: string; entrada: string; salida: string; hours: number }> = {
  'A':  { name: 'Apertura',  entrada: '09:00', salida: '16:00', hours: 7 },
  'S':  { name: 'Seguido',   entrada: '10:00', salida: '22:00', hours: 10 },
  'C':  { name: 'Cierre',    entrada: '15:00', salida: '22:30', hours: 7.5 },
  'CD': { name: 'Cierre 14', entrada: '14:00', salida: '22:00', hours: 8 },
  'CS': { name: 'Cierre St', entrada: '16:00', salida: '22:30', hours: 6.5 },
  'P1': { name: 'Partido 9', entrada: '09:00', salida: '22:00', hours: 10 },
  'P2': { name: 'Partido 10',entrada: '10:00', salida: '22:30', hours: 10 },
}

export default function SimulatorTab() {
  const { employees, teams, turnosConfig, params, loading, error } = useRodriData()

  // Sim config state
  const [teamCoverage, setTeamCoverage] = useState<Record<string, Record<number, number>>>({})
  const [maxHours, setMaxHours] = useState(44)
  const [maxDays, setMaxDays] = useState(6)
  const [maxSplits, setMaxSplits] = useState(2)
  const [view, setView] = useState<'config' | 'results' | 'compare'>('config')

  // Convert params array to dict
  const paramsDict = useMemo(() => {
    const d: Record<string, any> = {}
    for (const p of params) d[p.key] = p.value
    return d
  }, [params])

  // Initialize team coverage from teams
  useEffect(() => {
    if (teams.length === 0) return
    const init: Record<string, Record<number, number>> = {}
    for (const t of teams) {
      init[t.nombre] = {}
      for (let d = 0; d < 7; d++) {
        // Default: more on Fri/Sat, less on Sun
        const base = d === 5 ? 5 : d === 0 ? 2 : 3 // Sat=5, Sun=2, others=3
        init[t.nombre][d] = base
      }
    }
    setTeamCoverage(init)
  }, [teams])

  // ── Shift cost calculator ──
  const calcShiftCost = useMemo(() => {
    const jornadaDiaria = Number(paramsDict.jornadaDiaria ?? 8)
    const jornadaSemanal = Number(paramsDict.jornadaSemanal ?? 44)
    const recNoct = Number(paramsDict.recNoct ?? 0.35)
    const recExtDiur = Number(paramsDict.recExtDiur ?? 0.25)
    const recExtNoct = Number(paramsDict.recExtNoct ?? 0.75)
    const recDom = Number(paramsDict.recDom ?? 0.80)
    const salario = Number(paramsDict.salario ?? 1750905)
    const inicioNoct = Number(paramsDict.inicioNoct ?? 19)
    const finNoct = Number(paramsDict.finNoct ?? 6)
    const valorHora = salario / jornadaSemanal

    return (shiftCode: string, dayIndex: number) => {
      const def = SHIFT_DEFS[shiftCode]
      if (!def) return { hours: 0, nightHours: 0, cost: 0, isSplit: false, isSunday: dayIndex === 0 }
      const isSunday = dayIndex === 0
      const isSplit = shiftCode.startsWith('P')
      const hours = def.hours

      // Night hours calculation
      const entMin = parseInt(def.entrada.split(':')[0]) * 60 + parseInt(def.entrada.split(':')[1])
      let salMin = parseInt(def.salida.split(':')[0]) * 60 + parseInt(def.salida.split(':')[1])
      if (salMin <= entMin) salMin += 1440 // past midnight

      let noctH = 0
      for (let m = entMin; m < salMin; m += 30) {
        const h = (m / 60) % 24
        if (h >= inicioNoct || h < finNoct) noctH += 0.5
      }

      // Cost with Colombian labor recargos
      const regularHours = Math.min(hours, jornadaDiaria)
      const extraHours = Math.max(0, hours - jornadaDiaria)
      const nightRegular = Math.min(noctH, regularHours)

      let cost = regularHours * valorHora
      cost += nightRegular * valorHora * recNoct
      if (extraHours > 0) {
        // Extra hours: determine if fall in night or day
        const nightExtra = Math.max(0, noctH - nightRegular)
        const dayExtra = extraHours - nightExtra
        cost += dayExtra * valorHora * recExtDiur
        cost += nightExtra * valorHora * recExtNoct
        if (isSunday) cost += extraHours * valorHora * recDom
      }
      if (isSunday) cost += regularHours * valorHora * recDom

      return { hours, nightHours: noctH, cost, isSplit, isSunday }
    }
  }, [paramsDict])

  // ── Simulate: team-level shift assignment optimizer ──
  // Goal: minimize overtime + split shifts while meeting coverage
  const simResults = useMemo(() => {
    if (!employees.length) return []

    const jornadaSemanal = Number(paramsDict.jornadaSemanal ?? 44)

    const activeEmps = employees.filter(e => e.activo)

    // Group employees by team
    const teamEmps: Record<string, typeof activeEmps> = {}
    for (const emp of activeEmps) {
      const team = emp.team || 'Sin asignar'
      if (!teamEmps[team]) teamEmps[team] = []
      teamEmps[team].push(emp)
    }

    // For each team + day, assign shifts to meet coverage
    // Strategy: prioritize non-split shifts (A, S, C, CD, CS)
    // Only use split shifts (P1, P2) when coverage demands more people than
    // non-split shifts can provide in peak hours

    // Non-split shifts ordered by preference (least cost first)
    const nonSplitShifts = ['A', 'CD', 'CS', 'C', 'S'] // opening, early close, late close stew, close, followed
    // Split shifts (last resort)
    const splitShifts_codes = ['P1', 'P2']

    interface EmpSchedule {
      employee: typeof activeEmps[0]
      team: string
      shifts: (string | null)[] // shift per day, null = off
      weeklyHours: number
      nightHours: number
      splitCount: number
      daysWorked: number
      totalCost: number
    }

    const schedules: EmpSchedule[] = activeEmps.map(emp => ({
      employee: emp,
      team: emp.team || 'Sin asignar',
      shifts: [null, null, null, null, null, null, null] as (string | null)[],
      weeklyHours: 0,
      nightHours: 0,
      splitCount: 0,
      daysWorked: 0,
      totalCost: 0,
    }))

    const schedMap = new Map(activeEmps.map((e, i) => [e.id, schedules[i]]))

    // Process each team
    for (const [team, emps] of Object.entries(teamEmps)) {
      const coverage = teamCoverage[team]
      if (!coverage) continue

      const teamSchedules = schedules.filter(s => s.team === team)
      if (teamSchedules.length === 0) continue

      // Process each day
      for (let d = 0; d < 7; d++) {
        const needed = coverage[d] || 0
        if (needed === 0) continue // no coverage needed this day

        // Sort team members: prefer those with fewer hours so far (balance load)
        const available = teamSchedules
          .filter(s => s.shifts[d] === null && s.daysWorked < maxDays && s.weeklyHours < jornadaSemanal)
          .sort((a, b) => a.weeklyHours - b.weeklyHours) // least hours first

        let assigned = 0

        // Phase 1: Assign non-split shifts for the first N-1 people
        // Use different shifts to stagger coverage across the day
        const shiftRotation = d === 0 ? ['A', 'C'] : ['A', 'S', 'C', 'CD', 'CS']

        for (let i = 0; i < available.length && assigned < needed; i++) {
          const sched = available[i]
          // Pick shift from rotation, cycling through to distribute
          const shiftCode = shiftRotation[i % shiftRotation.length]

          const cost = calcShiftCost(shiftCode, d)

          // Check if adding this shift exceeds weekly limit
          if (sched.weeklyHours + cost.hours > jornadaSemanal + 4) continue // allow small overflow

          sched.shifts[d] = shiftCode
          sched.weeklyHours += cost.hours
          sched.nightHours += cost.nightHours
          sched.daysWorked += 1
          sched.totalCost += cost.cost
          assigned++
        }

        // Phase 2: If still need more coverage, use split shifts as last resort
        if (assigned < needed) {
          const stillAvailable = available.filter(s => s.shifts[d] === null)
          for (let i = 0; i < stillAvailable.length && assigned < needed; i++) {
            // Limit split shifts per employee
            if (stillAvailable[i].splitCount >= maxSplits) continue
            const sched = stillAvailable[i]
            const shiftCode = d === 0 ? 'P1' : 'P2'
            const cost = calcShiftCost(shiftCode, d)

            if (sched.weeklyHours + cost.hours > jornadaSemanal + 4) continue

            sched.shifts[d] = shiftCode
            sched.weeklyHours += cost.hours
            sched.nightHours += cost.nightHours
            sched.daysWorked += 1
            sched.splitCount += 1
            sched.totalCost += cost.cost
            assigned++
          }
        }

        // Phase 3: Ensure at least 1 free day per employee per week
        // Already handled by maxDays constraint,
        // but if someone works 7 days, remove their lightest day
      }
    }

    // Ensure each employee has at least 1 day off
    for (const sched of schedules) {
      if (sched.daysWorked === 7) {
        // Remove the shift with least hours
        let lightestDay = -1
        let lightestHours = Infinity
        for (let d = 0; d < 7; d++) {
          if (sched.shifts[d]) {
            const cost = calcShiftCost(sched.shifts[d]!, d)
            if (cost.hours < lightestHours) {
              lightestHours = cost.hours
              lightestDay = d
            }
          }
        }
        if (lightestDay >= 0) {
          const removed = calcShiftCost(sched.shifts[lightestDay]!, lightestDay)
          sched.shifts[lightestDay] = null
          sched.weeklyHours -= removed.hours
          sched.nightHours -= removed.nightHours
          sched.daysWorked -= 1
          if (sched.shifts[lightestDay]?.startsWith('P')) sched.splitCount -= 1
          sched.totalCost -= removed.cost
        }
      }
    }

    // Build results
    const results: SimResult[] = schedules.map(s => ({
      employee: s.employee.nombre,
      team: s.team,
      cargo: s.employee.cargo,
      weeklyHours: Math.round(s.weeklyHours * 10) / 10,
      overtimeHours: Math.round(Math.max(0, s.weeklyHours - jornadaSemanal) * 10) / 10,
      nightHours: Math.round(s.nightHours * 10) / 10,
      splitShifts: s.splitCount,
      daysWorked: s.daysWorked,
      cost: Math.round(s.totalCost),
    })).sort((a, b) => b.weeklyHours - a.weeklyHours)

    return results
  }, [employees, teamCoverage, maxDays, maxSplits, calcShiftCost])

  // ── Totals ──
  const totals = useMemo(() => {
    const totalHours = simResults.reduce((s, r) => s + r.weeklyHours, 0)
    const totalOT = simResults.reduce((s, r) => s + r.overtimeHours, 0)
    const totalNight = simResults.reduce((s, r) => s + r.nightHours, 0)
    const totalSplits = simResults.reduce((s, r) => s + r.splitShifts, 0)
    const totalCost = simResults.reduce((s, r) => s + r.cost, 0)
    const overLimit = simResults.filter(r => r.overtimeHours > 0).length
    return { totalHours, totalOT, totalNight, totalSplits, totalCost, overLimit, count: simResults.length }
  }, [simResults])

  // ── Current vs Simulated comparison ──
  const historicalOT = 63 // from week W20 analysis
  const historicalSplits = 8
  const savings = {
    ot: Math.max(0, historicalOT - totals.totalOT),
    splits: Math.max(0, historicalSplits - totals.totalSplits),
  }

  if (loading) return <div className="p-6 text-center text-[var(--text-secondary)]">Cargando datos...</div>
  if (error) return <div className="p-6 text-center text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Simulador de Configuraciones</h2>
        <p className="text-sm mt-1 text-[var(--text-secondary)]">
          Experimenta con configuraciones de equipos y turnos para minimizar horas extra y turnos partidos
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {(['config', 'results', 'compare'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-borgona-light)] dark:text-[var(--color-ak-madera)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            {v === 'config' ? 'Cobertura' : v === 'results' ? 'Resultados' : 'Comparar'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Horas Extra', value: totals.totalOT.toFixed(1), sub: `${totals.overLimit}/${totals.count} empleados`, color: totals.totalOT > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
          { label: 'Turnos Partidos', value: totals.totalSplits, sub: 'esta semana', color: totals.totalSplits > 5 ? 'var(--color-danger)' : 'var(--color-success)' },
          { label: 'Horas Nocturnas', value: totals.totalNight.toFixed(1), sub: `de ${totals.totalHours.toFixed(0)}h total`, color: 'var(--color-ak-ambar)' },
          { label: 'Costo Estimado', value: `$${(totals.totalCost/1000000).toFixed(1)}M`, sub: 'semana', color: 'var(--text-primary)' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4 bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="text-xs text-[var(--text-secondary)]">{kpi.label}</div>
            <div className="text-2xl font-bold mt-1" style={{color: kpi.color}}>{kpi.value}</div>
            <div className="text-xs mt-1 text-[var(--text-secondary)]">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Config View */}
      {view === 'config' && (
        <div className="space-y-4">
          {/* Global constraints */}
          <div className="rounded-xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <h3 className="font-semibold mb-3" style={{color:'var(--text-primary)'}}>Restricciones Globales</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs" style={{color:'var(--text-secondary)'}}>Max horas/semana</label>
                <input type="number" value={maxHours} onChange={e => setMaxHours(Number(e.target.value))}
                  className="w-full mt-1 rounded-lg px-3 py-2 text-sm" style={{background:'var(--bg-card-hover)', color:'var(--text-primary)', border:'1px solid var(--border)'}} />
              </div>
              <div>
                <label className="text-xs" style={{color:'var(--text-secondary)'}}>Max dias/semana</label>
                <input type="number" value={maxDays} onChange={e => setMaxDays(Number(e.target.value))}
                  className="w-full mt-1 rounded-lg px-3 py-2 text-sm" style={{background:'var(--bg-card-hover)', color:'var(--text-primary)', border:'1px solid var(--border)'}} />
              </div>
              <div>
                <label className="text-xs" style={{color:'var(--text-secondary)'}}>Max turnos partidos/empleado</label>
                <input type="number" value={maxSplits} onChange={e => setMaxSplits(Number(e.target.value))}
                  className="w-full mt-1 rounded-lg px-3 py-2 text-sm" style={{background:'var(--bg-card-hover)', color:'var(--text-primary)', border:'1px solid var(--border)'}} />
              </div>
            </div>
          </div>

          {/* Coverage matrix */}
          <div className="rounded-xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <h3 className="font-semibold mb-3" style={{color:'var(--text-primary)'}}>Cobertura Minima por Equipo y Dia</h3>
            <p className="text-xs mb-4" style={{color:'var(--text-secondary)'}}>
              Define cuantas personas necesita cada equipo cada dia. El simulador asignara turnos para cubrir.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2" style={{color:'var(--text-secondary)'}}>Equipo</th>
                    {DAY_NAMES.map(d => (
                      <th key={d} className="text-center p-2" style={{color:'var(--text-secondary)'}}>{d}</th>
                    ))}
                    <th className="text-center p-2" style={{color:'var(--text-secondary)'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => {
                    const color = TEAM_COLORS[team.nombre] || '#888'
                    const total = Object.values(teamCoverage[team.nombre] || {}).reduce((a,b) => a+b, 0)
                    const empsInTeam = employees.filter(e => e.activo && e.team === team.nombre).length
                    return (
                      <tr key={team.id} style={{borderTop:'1px solid var(--border)'}}>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{background:color}} />
                            <span style={{color:'var(--text-primary)'}}>{team.nombre}</span>
                            <span className="text-xs" style={{color:'var(--text-secondary)'}}>({empsInTeam} disp.)</span>
                          </div>
                        </td>
                        {DAY_NAMES.map((_, di) => (
                          <td key={di} className="text-center p-1">
                            <input type="number" min={0} max={10}
                              value={teamCoverage[team.nombre]?.[di] ?? 0}
                              onChange={e => {
                                const val = Number(e.target.value)
                                setTeamCoverage(prev => ({
                                  ...prev,
                                  [team.nombre]: { ...prev[team.nombre], [di]: val }
                                }))
                              }}
                              className="w-12 text-center rounded px-1 py-1 text-sm"
                              style={{background:'var(--bg-card-hover)', color:'var(--text-primary)', border:'1px solid var(--border)'}}
                            />
                          </td>
                        ))}
                        <td className="text-center p-2 font-semibold" style={{color: total > empsInTeam * maxDays ? 'var(--color-danger)' : 'var(--color-success)'}}>
                          {total}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Demand insights from historical data */}
          <div className="rounded-xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <h3 className="font-semibold mb-3" style={{color:'var(--text-primary)'}}>Insights de Demanda Historica (Abril)</h3>
            <div className="grid grid-cols-7 gap-2">
              {DAY_NAMES.map((d, i) => {
                const demand = [2.1, 2.5, 2.77, 2.75, 2.9, 3.45, 1.7][i] // avg from data
                const heat = Math.min(1, demand / 3.5)
                const r = Math.round(220 + heat * 35)
                const g = Math.round(220 - heat * 180)
                const b = Math.round(220 - heat * 180)
                return (
                  <div key={d} className="rounded-lg p-2 text-center" style={{background:`rgb(${r},${g},${b})`, color: heat > 0.5 ? 'white' : 'var(--text-primary)'}}>
                    <div className="text-xs font-semibold">{d}</div>
                    <div className="text-lg font-bold">{demand.toFixed(1)}</div>
                    <div className="text-xs">p/dia avg</div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs mt-3" style={{color:'var(--text-secondary)'}}>
              Basado en datos de abril: Viernes necesita ~35 personas, Sabado ~17, Domingo ~21
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {view === 'results' && (
        <div className="rounded-xl overflow-hidden" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{background:'var(--bg-card-hover)'}}>
                  {['Empleado','Equipo','Cargo','Dias','Horas/Sem','H.Extra','H.Noct','Partidos','Costo'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-medium" style={{color:'var(--text-secondary)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simResults.map((r, i) => (
                  <tr key={i} style={{borderTop:'1px solid var(--border)', background: r.overtimeHours > 0 ? 'rgba(239,68,68,0.08)' : 'transparent'}}>
                    <td className="p-3 font-medium" style={{color:'var(--text-primary)'}}>{r.employee}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{background:TEAM_COLORS[r.team] || '#888'}} />
                        <span style={{color:'var(--text-secondary)'}}>{r.team}</span>
                      </span>
                    </td>
                    <td className="p-3" style={{color:'var(--text-secondary)'}}>{r.cargo}</td>
                    <td className="p-3" style={{color:'var(--text-primary)'}}>{r.daysWorked}</td>
                    <td className="p-3 font-medium" style={{color: r.weeklyHours > maxHours ? 'var(--color-danger)' : 'var(--text-primary)'}}>
                      {r.weeklyHours}h
                    </td>
                    <td className="p-3 font-medium" style={{color: r.overtimeHours > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>
                      {r.overtimeHours > 0 ? `+${r.overtimeHours}h` : '0'}
                    </td>
                    <td className="p-3" style={{color:'var(--text-secondary)'}}>{r.nightHours}h</td>
                    <td className="p-3" style={{color: r.splitShifts > maxSplits ? 'var(--color-danger)' : 'var(--text-secondary)'}}>
                      {r.splitShifts}
                    </td>
                    <td className="p-3" style={{color:'var(--text-primary)'}}>${(r.cost/1000).toFixed(0)}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compare View */}
      {view === 'compare' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}>
            <h3 className="font-semibold mb-4" style={{color:'var(--text-primary)'}}>Actual vs Simulado</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Current */}
              <div className="rounded-lg p-4" style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)'}}>
                <div className="text-sm font-semibold" style={{color:'var(--color-danger)'}}>Semana Actual (W20)</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Horas extra totales</span><span className="font-bold" style={{color:'var(--color-danger)'}}>63h</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Turnos partidos</span><span className="font-bold" style={{color:'var(--color-danger)'}}>8</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Empleados en exceso</span><span className="font-bold" style={{color:'var(--color-danger)'}}>2 de 4</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Mayor exceso</span><span className="font-bold" style={{color:'var(--color-danger)'}}>Carlos 79h/6d</span></div>
                </div>
              </div>
              {/* Simulated */}
              <div className="rounded-lg p-4" style={{background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)'}}>
                <div className="text-sm font-semibold" style={{color:'var(--color-success)'}}>Configuracion Simulada</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Horas extra totales</span><span className="font-bold" style={{color: totals.totalOT > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>{totals.totalOT.toFixed(1)}h</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Turnos partidos</span><span className="font-bold" style={{color: totals.totalSplits > 5 ? 'var(--color-danger)' : 'var(--color-success)'}}>{totals.totalSplits}</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Empleados en exceso</span><span className="font-bold" style={{color: totals.overLimit > 0 ? 'var(--color-danger)' : 'var(--color-success)'}}>{totals.overLimit}/{totals.count}</span></div>
                  <div className="flex justify-between"><span style={{color:'var(--text-secondary)'}}>Costo estimado</span><span className="font-bold" style={{color:'var(--color-success)'}}>${(totals.totalCost/1000000).toFixed(2)}M</span></div>
                </div>
              </div>
            </div>

            {/* Savings */}
            <div className="mt-4 rounded-lg p-4" style={{background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)'}}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{color:'var(--color-success)'}}>{savings.ot > 0 ? `-${savings.ot.toFixed(0)}h` : 'N/A'}</div>
                  <div className="text-xs" style={{color:'var(--text-secondary)'}}>Reduccion Horas Extra</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{color:'var(--color-success)'}}>{savings.splits > 0 ? `-${savings.splits}` : 'N/A'}</div>
                  <div className="text-xs" style={{color:'var(--text-secondary)'}}>Reduccion Turnos Partidos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{color:'var(--color-ak-ambar)'}}>A configurar</div>
                  <div className="text-xs" style={{color:'var(--text-secondary)'}}>Ajusta cobertura para optimizar</div>
                </div>
              </div>
            </div>
          </div>

          {/* Missing teams warning */}
          <div className="rounded-xl p-4" style={{background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)'}}>
            <h3 className="font-semibold" style={{color:'var(--color-ak-ambar)'}}>Equipos sin personal asignado</h3>
            <p className="text-sm mt-2" style={{color:'var(--text-secondary)'}}>
              Los siguientes equipos existen pero no tienen empleados activos. Agrega personal para simulaciones mas precisas:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {teams.filter(t => !employees.some(e => e.activo && e.team === t.nombre)).map(t => (
                <span key={t.id} className="px-3 py-1 rounded-full text-xs font-medium" style={{background:'rgba(245,158,11,0.15)', color:'var(--color-ak-ambar)', border:'1px solid rgba(245,158,11,0.3)'}}>
                  {t.nombre} (0 empleados)
                </span>
              ))}
            </div>
            <p className="text-xs mt-3" style={{color:'var(--text-secondary)'}}>
              El biométrico de abril registró 39 personas, pero solo 14 están en la tabla de empleados.
              Los equipos Servicio, Ático, Keller y Taller necesitan personal asignado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}