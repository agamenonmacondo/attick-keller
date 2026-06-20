'use client'

import { useState, useMemo, useRef } from 'react'
import { useRodriData, formatCOP } from '@/lib/hooks/useRodriData'
import {
  Warning,
  CheckCircle,
  PlayCircle,
  Spinner,
  Clock,
  Users,
  CalendarDots,
  ChartBar,
  Scales,
} from '@phosphor-icons/react'

// ── Shift definitions (NO split shifts, P1/P2 eliminated) ──
const SHIFT_DEFS: Record<string, { name: string; entrada: string; salida: string; hours: number }> = {
  'A':  { name: 'Apertura',   entrada: '09:00', salida: '16:00', hours: 7 },
  'S':  { name: 'Seguido',    entrada: '10:00', salida: '22:00', hours: 10 },
  'C':  { name: 'Cierre',     entrada: '15:00', salida: '22:30', hours: 7.5 },
  'CD': { name: 'Cierre 14h', entrada: '14:00', salida: '22:00', hours: 8 },
  'CS': { name: 'Cierre St',  entrada: '16:00', salida: '22:30', hours: 6.5 },
  'X':  { name: 'Descanso',   entrada: '',      salida: '',      hours: 0 },
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const DAY_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Per-team demand per day (0=Sun). Estimates from Alejandro/Seadotec.
// Cocina has HIGH demand Sat (dinner service ~25). Servicio/Bar have lower Sat demand.
const TEAM_HISTORICAL_DEMAND: Record<string, Record<number, { avgWorkers: number }>> = {
  'Cocina': {
    0: { avgWorkers: 18 },
    1: { avgWorkers: 20 },
    2: { avgWorkers: 22 },
    3: { avgWorkers: 22 },
    4: { avgWorkers: 24 },
    5: { avgWorkers: 28 },
    6: { avgWorkers: 25 },
  },
  'Servicio': {
    0: { avgWorkers: 15 },
    1: { avgWorkers: 18 },
    2: { avgWorkers: 20 },
    3: { avgWorkers: 20 },
    4: { avgWorkers: 22 },
    5: { avgWorkers: 28 },
    6: { avgWorkers: 15 },
  },
  'Bar': {
    0: { avgWorkers: 10 },
    1: { avgWorkers: 12 },
    2: { avgWorkers: 14 },
    3: { avgWorkers: 14 },
    4: { avgWorkers: 16 },
    5: { avgWorkers: 20 },
    6: { avgWorkers: 12 },
  },
}

const TEAM_NAMES = Object.keys(TEAM_HISTORICAL_DEMAND)

// Average demand across all teams for "Todos" view
function getGlobalDemand(day: number): number {
  const teams = TEAM_NAMES
  let sum = 0
  for (const t of teams) sum += TEAM_HISTORICAL_DEMAND[t][day]?.avgWorkers ?? 0
  return Math.round(sum / teams.length)
}

// Total demand across all teams (sum) for coverage/totals computations
function getTotalDemand(day: number): number {
  const teams = TEAM_NAMES
  let sum = 0
  for (const t of teams) sum += TEAM_HISTORICAL_DEMAND[t][day]?.avgWorkers ?? 0
  return sum
}

function getTeamDemand(team: string, day: number): number {
  const td = TEAM_HISTORICAL_DEMAND[team]?.[day]
  if (td) return td.avgWorkers
  return getGlobalDemand(day)
}

// Compute per-team rest-priority label: Prohibido > Limitado > Descanso
function getDayLabel(day: number, team: string): string {
  const demand = getTeamDemand(team, day)
  const maxDemand = getTeamDemand(team, 5) // Friday is always max
  const friIsMax = day === 5
  const thuIsLimited = day === 4
  const threshold = maxDemand * 0.85

  if (friIsMax) return 'Prohibido'
  if (thuIsLimited) return 'Limitado'
  if (demand >= threshold) return 'Limitado'
  return 'Descanso'
}

// Day demand profiles for shift distribution selection
const DAY_PROFILES: Record<number, string> = {
  5: 'heavy',
  4: 'busy',
  6: 'dinner',
  0: 'light',
  1: 'light',
  2: 'moderate',
  3: 'moderate',
}

// Shift distribution targets per day profile (must sum to ~1.0)
const SHIFT_PROFILES: Record<string, Record<string, number>> = {
  heavy:    { A: 0.15, S: 0.35, C: 0.15, CD: 0.20, CS: 0.15 },
  busy:     { A: 0.20, S: 0.25, C: 0.15, CD: 0.25, CS: 0.15 },
  moderate: { A: 0.25, S: 0.15, C: 0.20, CD: 0.25, CS: 0.15 },
  light:    { A: 0.30, S: 0.10, C: 0.20, CD: 0.20, CS: 0.20 },
  dinner:   { A: 0.10, S: 0.20, C: 0.25, CD: 0.20, CS: 0.25 },
}

// Shift hours for sorting (shorter first = lower hours burden)
const SHIFT_HOURS: Record<string, number> = {
  'CS': 6.5,
  'A':  7,
  'C':  7.5,
  'CD': 8,
  'S':  10,
}

// Shift type identifier colors — not themeable
const SHIFT_COLORS: Record<string, string> = {
  'A':  '#22c55e',
  'S':  '#3b82f6',
  'C':  '#f97316',
  'CD': '#eab308',
  'CS': '#a855f7',
  'X':  '#6b7280',
}

// ── Seeded PRNG (Mulberry32) ──
// Deterministic random number generator for reproducible but fair shuffles.
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// ── ISO Week Number ──
function getISOWeekNumber(): number {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ── Types ──

interface DayAssignment {
  shiftCode: string
  entrada: string
  salida: string
  hours: number
  isSunday: boolean
  nightHours: number
  cost: number
}

interface EmployeeSchedule {
  employeeId: string
  nombre: string
  team: string
  cargo: string
  restDay: number
  schedule: (DayAssignment | null)[]
  totalHours: number
  totalOvertime: number
  totalNight: number
  splitShifts: number
  totalCost: number
  daysOff: number
}

interface SimulationResult {
  name: string
  maxWeeklyHours: number
  allowSeguido: boolean
  schedules: EmployeeSchedule[]
  totalHours: number
  totalOT: number
  totalSplits: number
  totalNight: number
  totalCost: number
  overLimit: number
  tercerosByDay: Record<number, number>
  totalTerceros: number
  tercerosCost: number
  coverageByDay: Record<number, { working: number; needed: number }>
}

interface EmpData {
  id: string
  nombre: string
  team: string
  cargo: string
}

// ── Dynamic eligible rest days calculator ──
// For a given team (or "global"), compute which days are eligible for rest
// and what share of rests each day should receive.
// Shares are proportional to (maxDemand - dayDemand), so lowest-demand days get the most rests.

interface EligibleDay {
  day: number
  demand: number
  share: number
}

function getEligibleRestDays(team: string): EligibleDay[] {
  // Collect team-adjusted demand for all days
  const demands: number[] = []
  for (let d = 0; d < 7; d++) {
    demands[d] = getTeamDemand(team, d)
  }

  // Friday (5) is NEVER eligible for rest — highest revenue day
  // Thursday (4) is limited — only eligible if demand is relatively low
  const maxDemand = demands[5] // Friday is always max

  const eligible: EligibleDay[] = []

  for (let d = 0; d < 7; d++) {
    if (d === 5) continue // Friday never rests

    // Thursday only eligible if demand is at least 15% below max
    if (d === 4 && demands[d] >= maxDemand * 0.85) continue

    eligible.push({ day: d, demand: demands[d], share: 0 })
  }

  // Sort by demand ascending (lowest demand = highest rest priority)
  eligible.sort((a, b) => a.demand - b.demand)

  // Calculate shares: proportional to (maxDemand - demand)
  const weights = eligible.map(e => Math.max(1, maxDemand - e.demand))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < eligible.length; i++) {
    eligible[i].share = totalWeight > 0 ? weights[i] / totalWeight : 1 / eligible.length
  }

  return eligible
}

// ── Schedule validation (dev mode only) ──
// Runs assertions to catch algorithmic errors early.

interface ValidationIssue {
  test: string
  passed: boolean
  detail: string
}

function validateSchedule(
  schedules: EmployeeSchedule[],
  activeEmps: EmpData[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Test 1: Every active employee has exactly 1 rest day
  for (const s of schedules) {
    const restCount = s.schedule.filter(d => d === null).length
    if (restCount !== 1) {
      issues.push({
        test: 'One rest day per employee',
        passed: false,
        detail: `${s.nombre} has ${restCount} rest days (expected 1)`,
      })
    }
  }
  if (issues.filter(i => i.test === 'One rest day per employee' && !i.passed).length === 0) {
    issues.push({ test: 'One rest day per employee', passed: true, detail: `All ${schedules.length} employees have exactly 1 rest day` })
  }

  // Test 2: No Friday rests
  const friRests = schedules.filter(s => s.restDay === 5)
  issues.push({
    test: 'No Friday rests',
    passed: friRests.length === 0,
    detail: friRests.length === 0 ? 'Zero Friday rests' : `${friRests.length} employees rest Friday: ${friRests.map(s => s.nombre).join(', ')}`,
  })

  // Test 3: Total rests = total employees
  issues.push({
    test: 'Total rests = total employees',
    passed: schedules.length === activeEmps.length,
    detail: `${schedules.length} schedules, ${activeEmps.length} active employees`,
  })

  // Test 4: Zero split shifts
  const totalSplits = schedules.reduce((s, r) => s + r.splitShifts, 0)
  issues.push({
    test: 'Zero split shifts',
    passed: totalSplits === 0,
    detail: totalSplits === 0 ? 'No split shifts' : `${totalSplits} split shifts detected`,
  })

  // Test 5: Saturday rest distribution per team
  // For cocina (high Sat demand), Saturday rests should not dominate
  const teams = new Set(schedules.map(s => s.team))
  for (const team of teams) {
    const teamScheds = schedules.filter(s => s.team === team)
    if (teamScheds.length === 0) continue

    const satRests = teamScheds.filter(s => s.restDay === 6).length
    const sunRests = teamScheds.filter(s => s.restDay === 0).length
    const satDemand = getTeamDemand(team, 6)
    const sunDemand = getTeamDemand(team, 0)

    // If Saturday demand >= Sunday demand, Saturday rests should be <= Sunday rests
    if (satDemand >= sunDemand) {
      const ok = satRests <= sunRests
      issues.push({
        test: `Sat rest <= Sun rest (${team})`,
        passed: ok,
        detail: ok
          ? `${team}: Sat ${satRests} rests <= Sun ${sunRests} rests (demand: Sat=${satDemand} Sun=${sunDemand})`
          : `${team}: Sat ${satRests} rests > Sun ${sunRests} rests but Sat demand (${satDemand}) >= Sun demand (${sunDemand})`,
      })
    }
  }

  // Test 6: Coverage check per day against demand
  for (let d = 0; d < 7; d++) {
    const working = schedules.filter(s => s.schedule[d] !== null).length
    const needed = getTotalDemand(d)
    if (needed > 0 && working < needed * 0.6) {
      issues.push({
        test: `Coverage D${d}`,
        passed: false,
        detail: `${DAY_NAMES[d]}: ${working}/${needed} working (${(working / needed * 100).toFixed(0)}%) — below 60% threshold`,
      })
    }
  }

  return issues
}

// ── Cost calculator (closure over labor law params) ──

function makeCostCalculator(p: Record<string, number>) {
  const jDiaria = p.jornadaDiaria ?? 8
  const recNoct = p.recNoct ?? 0.35
  const recExtDiur = p.recExtDiur ?? 0.25
  const recExtNoct = p.recExtNoct ?? 0.75
  const recDom = p.recDom ?? 0.80
  const recExtDomDiur = p.recExtDomDiur ?? 1.05
  const recExtDomNoct = p.recExtDomNoct ?? 1.55
  const inicioNoct = p.inicioNoct ?? 19
  const finNoct = p.finNoct ?? 6
  const valorHora = p.valorHora ?? (p.salario ?? 1423500) / (p.jornadaSemanal ?? 44)

  return (shiftCode: string, dayIndex: number): DayAssignment => {
    const def = SHIFT_DEFS[shiftCode]
    if (!def || shiftCode === 'X') {
      return { shiftCode, entrada: '', salida: '', hours: 0, isSunday: dayIndex === 0, nightHours: 0, cost: 0 }
    }

    const isSunday = dayIndex === 0
    const hours = def.hours
    const [eH, eM] = def.entrada.split(':').map(Number)
    const [sH, sM] = def.salida.split(':').map(Number)
    let entMin = eH * 60 + eM
    let salMin = sH * 60 + sM
    if (salMin <= entMin) salMin += 1440

    let noctH = 0
    for (let m = entMin; m < salMin; m += 30) {
      const h = (m / 60) % 24
      if (h >= inicioNoct || h < finNoct) noctH += 0.5
    }

    const regular = Math.min(hours, jDiaria)
    const extra = Math.max(0, hours - jDiaria)
    const nightReg = Math.min(noctH, regular)
    const dayReg = regular - nightReg
    const nightExt = Math.max(0, noctH - nightReg)
    const dayExt = Math.max(0, extra - nightExt)

    let cost = 0
    cost += dayReg * valorHora
    cost += nightReg * valorHora * (1 + recNoct)
    if (extra > 0) {
      if (isSunday) {
        cost += dayExt * valorHora * (1 + recExtDomDiur)
        cost += nightExt * valorHora * (1 + recExtDomNoct)
      } else {
        cost += dayExt * valorHora * (1 + recExtDiur)
        cost += nightExt * valorHora * (1 + recExtNoct)
      }
    }
    if (isSunday) cost += regular * valorHora * recDom

    return { shiftCode, entrada: def.entrada, salida: def.salida, hours, isSunday, nightHours: noctH, cost }
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE ALGORITHM: 3-Phase Constraint-Based Scheduling
// ═══════════════════════════════════════════════════════════════
//
// PHASE 1 (REWRITTEN): Team-aware staggered rest day assignment
//   - Uses team-specific demand (cocina Sat=25, not global 17)
//   - Dynamic share calculation from demand deficit
//   - Seeded shuffle (ISO week number) for deterministic but rotating assignments
//   - Rests distributed per-team, not globally — prevents one team
//     from absorbing all Saturday rests
//
// PHASE 2: Per-day shift assignment (unchanged from original)
//
// PHASE 3: Overtime calculation + validation (enhanced)

function generateSchedule(
  activeEmps: EmpData[],
  maxWeeklyHours: number,
  allowSeguido: boolean,
  params: Record<string, number>,
  weekSeed: number,
): EmployeeSchedule[] {
  const totalEmps = activeEmps.length
  if (totalEmps === 0) return []

  const calcCost = makeCostCalculator(params)
  const jSemanal = Number(params.jornadaSemanal ?? 44)
  const rng = mulberry32(weekSeed)

  // ═══════════════════════════════════════════
  // PHASE 1: Team-aware staggered rest day assignment
  // ═══════════════════════════════════════════

  // Group employees by team
  const teamGroups = new Map<string, EmpData[]>()
  for (const emp of activeEmps) {
    const t = emp.team || 'Sin asignar'
    if (!teamGroups.has(t)) teamGroups.set(t, [])
    teamGroups.get(t)!.push(emp)
  }

  // Compute per-employee rest day
  const empRestDays = new Map<string, number>()

  for (const [team, members] of teamGroups) {
    const teamSize = members.length
    const eligible = getEligibleRestDays(team)

    if (eligible.length === 0) {
      // Fallback: rest on Sunday if no eligible days
      for (const m of members) empRestDays.set(m.id, 0)
      continue
    }

    // Calculate target rest counts per eligible day based on dynamic shares
    const restTargets: Record<number, number> = {}
    for (const e of eligible) restTargets[e.day] = 0

    let assigned = 0
    for (const e of eligible) {
      restTargets[e.day] = Math.round(teamSize * e.share)
      assigned += restTargets[e.day]
    }

    // Adjust to exact team size (prefer lowest-demand days for extras)
    let diff = teamSize - assigned
    let adjustIter = 0
    while (diff !== 0 && adjustIter < 100) {
      adjustIter++
      if (diff > 0) {
        for (const e of eligible) {
          restTargets[e.day]++
          diff--
          if (diff === 0) break
        }
      } else {
        for (const e of [...eligible].reverse()) {
          if (restTargets[e.day] > 0) {
            restTargets[e.day]--
            diff++
            if (diff === 0) break
          }
        }
      }
    }

    // Verify: Friday never gets rests
    restTargets[5] = 0

    // Build flat list of rest day assignments for this team
    const teamRestList: number[] = []
    for (const e of eligible) {
      for (let i = 0; i < restTargets[e.day]; i++) {
        teamRestList.push(e.day)
      }
    }
    // Safety: pad to team size with lowest-demand day
    while (teamRestList.length < teamSize) {
      teamRestList.push(eligible[0].day)
    }

    // Seeded shuffle for deterministic but rotating distribution
    const shuffled = seededShuffle(teamRestList, rng)

    // Assign to team members
    for (let i = 0; i < members.length; i++) {
      empRestDays.set(members[i].id, shuffled[i])
    }
  }

  // Initialize schedule objects
  const schedMap = new Map<string, EmployeeSchedule>()
  for (const emp of activeEmps) {
    schedMap.set(emp.id, {
      employeeId: emp.id,
      nombre: emp.nombre,
      team: emp.team || 'Sin asignar',
      cargo: emp.cargo,
      restDay: empRestDays.get(emp.id) ?? 0,
      schedule: [null, null, null, null, null, null, null],
      totalHours: 0,
      totalOvertime: 0,
      totalNight: 0,
      splitShifts: 0,
      totalCost: 0,
      daysOff: 1,
    })
  }

  // ═══════════════════════════════════════════
  // PHASE 2: Per-day shift assignment
  // ═══════════════════════════════════════════
  for (let d = 0; d < 7; d++) {
    const profile = DAY_PROFILES[d] || 'moderate'
    const distribution = SHIFT_PROFILES[profile]

    let availableShifts = Object.keys(distribution) as string[]
    if (!allowSeguido) {
      availableShifts = availableShifts.filter(s => s !== 'S')
    }
    if (availableShifts.length === 0) availableShifts = ['A', 'C', 'CD']

    // Employees working this day (not resting on this day)
    const workingEmps: EmployeeSchedule[] = []
    for (const emp of activeEmps) {
      const restDay = empRestDays.get(emp.id) ?? -1
      if (restDay !== d) {
        workingEmps.push(schedMap.get(emp.id)!)
      }
    }

    // Target count per shift type based on profile distribution
    const shiftTargets: Record<string, number> = {}
    let assigned = 0
    for (const s of availableShifts) {
      shiftTargets[s] = Math.round(workingEmps.length * distribution[s])
      assigned += shiftTargets[s]
    }

    // Adjust to exact working count (prefer shorter shifts for extras)
    let diff = workingEmps.length - assigned
    const shiftsByLen = [...availableShifts].sort((a, b) => SHIFT_HOURS[a] - SHIFT_HOURS[b])
    let adjustIter = 0
    while (diff !== 0 && adjustIter < 200) {
      adjustIter++
      if (diff > 0) {
        for (const s of shiftsByLen) {
          shiftTargets[s]++
          diff--
          if (diff === 0) break
        }
      } else {
        for (const s of [...shiftsByLen].reverse()) {
          if (shiftTargets[s] > 0) {
            shiftTargets[s]--
            diff++
            if (diff === 0) break
          }
        }
      }
    }

    // Build flat shift list for this day and shuffle
    const flatShifts: string[] = []
    for (const [s, count] of Object.entries(shiftTargets)) {
      for (let i = 0; i < count; i++) flatShifts.push(s)
    }
    const shuffledShifts = seededShuffle(flatShifts, rng)

    // Sort working employees by current weekly hours (ascending)
    // Give longer shifts to those with fewer accumulated hours
    const sortedEmps = [...workingEmps].sort((a, b) => a.totalHours - b.totalHours)
    // Sort shifts longest-first so first employees (lowest hours) get longest shifts
    shuffledShifts.sort((a, b) => SHIFT_HOURS[b] - SHIFT_HOURS[a])

    for (let i = 0; i < sortedEmps.length; i++) {
      const emp = sortedEmps[i]
      const hoursRemaining = maxWeeklyHours - emp.totalHours

      // Pick appropriate shift from the shuffled pool
      let selectedShift = shuffledShifts[i] || availableShifts[0]

      // Constraint: don't exceed weekly limit by too much
      if (SHIFT_HOURS[selectedShift] > hoursRemaining + 2 && hoursRemaining > 0) {
        const shorterOpts = availableShifts
          .filter(s => SHIFT_HOURS[s] <= hoursRemaining + 1)
          .sort((a, b) => SHIFT_HOURS[a] - SHIFT_HOURS[b])
        if (shorterOpts.length > 0) {
          selectedShift = shorterOpts[0]
        }
      }

      const costInfo = calcCost(selectedShift, d)
      emp.schedule[d] = costInfo
      emp.totalHours += costInfo.hours
      emp.totalNight += costInfo.nightHours
      emp.totalCost += costInfo.cost
    }
  }

  // ═══════════════════════════════════════════
  // PHASE 3: Overtime calculation & finalization
  // ═══════════════════════════════════════════
  for (const sched of schedMap.values()) {
    sched.totalOvertime = Math.max(0, sched.totalHours - jSemanal)
    sched.splitShifts = 0
  }

  return Array.from(schedMap.values())
}

// ── Simulation runner ──

function runSimulations(
  activeEmps: EmpData[],
  params: Record<string, number>,
  weekSeed: number,
): SimulationResult[] {
  const jSemanal = Number(params.jornadaSemanal ?? 44)
  const valorHora = Number(params.valorHora ?? (params.salario ?? 1423500) / jSemanal)

  const scenarios = [
    { name: 'Conservador', maxWeeklyHours: jSemanal, allowSeguido: false },
    { name: 'Balanceado',  maxWeeklyHours: jSemanal + 2, allowSeguido: true },
    { name: 'Agresivo',    maxWeeklyHours: jSemanal + 4, allowSeguido: true },
  ]

  return scenarios.map(scenario => {
    const scheds = generateSchedule(activeEmps, scenario.maxWeeklyHours, scenario.allowSeguido, params, weekSeed)

    const totalHours = scheds.reduce((s, r) => s + r.totalHours, 0)
    const totalOT = scheds.reduce((s, r) => s + r.totalOvertime, 0)
    const totalSplits = scheds.reduce((s, r) => s + r.splitShifts, 0)
    const totalNight = scheds.reduce((s, r) => s + r.totalNight, 0)
    const totalCost = scheds.reduce((s, r) => s + r.totalCost, 0)
    const overLimit = scheds.filter(r => r.totalOvertime > 0).length

    const tercerosByDay: Record<number, number> = {}
    const coverageByDay: Record<number, { working: number; needed: number }> = {}
    let totalTerceros = 0
    let tercerosCost = 0

    for (let d = 0; d < 7; d++) {
      const working = scheds.filter(s => s.schedule[d] !== null).length
      const needed = getTotalDemand(d)
      const deficit = Math.max(0, needed - working)
      tercerosByDay[d] = deficit
      coverageByDay[d] = { working, needed }
      totalTerceros += deficit
      tercerosCost += deficit * 8 * valorHora * 1.3
    }

    return {
      name: scenario.name,
      maxWeeklyHours: scenario.maxWeeklyHours,
      allowSeguido: scenario.allowSeguido,
      schedules: scheds,
      totalHours,
      totalOT,
      totalSplits,
      totalNight,
      totalCost,
      overLimit,
      tercerosByDay,
      totalTerceros,
      tercerosCost,
      coverageByDay,
    }
  })
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function AutoScheduleTab() {
  const { employees, params, loading, error } = useRodriData()
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [simulations, setSimulations] = useState<SimulationResult[]>([])
  const [generated, setGenerated] = useState(false)
  const [simsRun, setSimsRun] = useState(false)
  const [activeSimName, setActiveSimName] = useState('')
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [selectedDemandTeam, setSelectedDemandTeam] = useState<string>('Cocina')
  const weekSeedRef = useRef(getISOWeekNumber())

  // ── Derived state ──

  const paramsDict = useMemo(() => {
    const d: Record<string, any> = {}
    for (const p of params) d[p.key] = p.value
    return d
  }, [params])

  const algoParams = useMemo(() => {
    const jDiaria = Number(paramsDict.jornadaDiaria ?? 8)
    const jSemanal = Number(paramsDict.jornadaSemanal ?? 44)
    const recNoct = Number(paramsDict.recNoct ?? 0.35)
    const recExtDiur = Number(paramsDict.recExtDiur ?? 0.25)
    const recExtNoct = Number(paramsDict.recExtNoct ?? 0.75)
    const recDom = Number(paramsDict.recDom ?? 0.80)
    const recExtDomDiur = Number(paramsDict.recExtDomDiur ?? 1.05)
    const recExtDomNoct = Number(paramsDict.recExtDomNoct ?? 1.55)
    const salario = Number(paramsDict.salario ?? 1423500)
    const inicioNoct = Number(paramsDict.inicioNoct ?? 19)
    const finNoct = Number(paramsDict.finNoct ?? 6)
    const valorHora = salario / jSemanal
    return {
      jDiaria, jSemanal, recNoct, recExtDiur, recExtNoct,
      recDom, recExtDomDiur, recExtDomNoct,
      salario, inicioNoct, finNoct, valorHora,
    }
  }, [paramsDict])

  const activeEmps: EmpData[] = useMemo(() =>
    employees
      .filter(e => e.activo)
      .map(e => ({
        id: e.id,
        nombre: e.nombre,
        team: e.team || 'Sin asignar',
        cargo: e.cargo,
      })),
    [employees])

  const unassignedCount = useMemo(() =>
    employees.filter(e => e.activo && (!e.team || e.team === 'Sin asignar')).length,
    [employees])

  // ── Per-team eligible rest days (for UI display) ──
  const teamEligibleDays = useMemo(() => {
    const teams = new Set(activeEmps.map(e => e.team || 'Sin asignar'))
    const result: Record<string, EligibleDay[]> = {}
    for (const t of teams) {
      result[t] = getEligibleRestDays(t)
    }
    return result
  }, [activeEmps])

  // ── Actions ──

  const handleGenerate = () => {
    const weekSeed = getISOWeekNumber()
    weekSeedRef.current = weekSeed
    const result = generateSchedule(activeEmps, algoParams.jSemanal + 2, true, algoParams, weekSeed)
    setSchedules(result.sort((a, b) => b.totalHours - a.totalHours))
    setGenerated(true)
    setSimsRun(false)
    setActiveSimName('Balanceado')

    // Run validation in dev mode
    const issues = validateSchedule(result, activeEmps)
    setValidationIssues(issues)
    if (issues.some(i => !i.passed)) {
      console.warn('[AutoSchedule] Validation issues:', issues.filter(i => !i.passed))
    }
  }

  const handleRunSimulations = () => {
    const weekSeed = getISOWeekNumber()
    weekSeedRef.current = weekSeed
    const results = runSimulations(activeEmps, algoParams, weekSeed)
    setSimulations(results)
    const balanced = results.find(r => r.name === 'Balanceado') || results[0]
    setSchedules(balanced.schedules.sort((a, b) => b.totalHours - a.totalHours))
    setGenerated(true)
    setSimsRun(true)
    setActiveSimName(balanced.name)

    const issues = validateSchedule(balanced.schedules, activeEmps)
    setValidationIssues(issues)
    if (issues.some(i => !i.passed)) {
      console.warn('[AutoSchedule] Validation issues:', issues.filter(i => !i.passed))
    }
  }

  const handleSwitchSimulation = (name: string) => {
    const sim = simulations.find(s => s.name === name)
    if (!sim) return
    setSchedules(sim.schedules.sort((a, b) => b.totalHours - a.totalHours))
    setActiveSimName(name)
  }

  // ── Computed summaries ──

  const coverageByDay = useMemo(() => {
    if (!generated || schedules.length === 0) return {}
    const result: Record<number, { working: number; needed: number }> = {}
    for (let d = 0; d < 7; d++) {
      result[d] = {
        working: schedules.filter(s => s.schedule[d] !== null).length,
        needed: getTotalDemand(d),
      }
    }
    return result
  }, [schedules, generated])

  const totals = useMemo(() => {
    if (!schedules.length) {
      return {
        totalHours: 0, totalOT: 0, totalNight: 0, totalSplits: 0,
        totalCost: 0, overLimit: 0, count: 0, totalTerceros: 0, tercerosCost: 0,
      }
    }
    const jSemanal = Number(paramsDict.jornadaSemanal ?? 44)
    const valorHora = Number(paramsDict.salario ?? 1423500) / jSemanal
    let totalTerceros = 0
    let tercerosCost = 0
    for (let d = 0; d < 7; d++) {
      const working = schedules.filter(s => s.schedule[d] !== null).length
      const deficit = Math.max(0, getTotalDemand(d) - working)
      totalTerceros += deficit
      tercerosCost += deficit * 8 * valorHora * 1.3
    }
    return {
      totalHours: schedules.reduce((s, r) => s + r.totalHours, 0),
      totalOT: schedules.reduce((s, r) => s + r.totalOvertime, 0),
      totalNight: schedules.reduce((s, r) => s + r.totalNight, 0),
      totalSplits: schedules.reduce((s, r) => s + r.splitShifts, 0),
      totalCost: schedules.reduce((s, r) => s + r.totalCost, 0),
      overLimit: schedules.filter(r => r.totalOvertime > 0).length,
      count: schedules.length,
      totalTerceros,
      tercerosCost,
    }
  }, [schedules, paramsDict])

  const restDayDist = useMemo(() => {
    const dist: Record<number, number> = {}
    for (let d = 0; d < 7; d++) dist[d] = 0
    for (const s of schedules) dist[s.restDay]++
    return dist
  }, [schedules])

  const bestScenario = useMemo(() => {
    if (simulations.length !== 3) return null
    return simulations.reduce((best, sim) => {
      const score = sim.totalOT + sim.totalSplits * 10 + sim.totalTerceros * 5
      const bestScore = best.totalOT + best.totalSplits * 10 + best.totalTerceros * 5
      return score < bestScore ? sim : best
    })
  }, [simulations])

  const withinLimitCount = schedules.filter(s => s.totalOvertime === 0).length

  // ── SWC-safe pre-computed style booleans ──
  const hasOT = totals.totalOT > 0
  const otColor = hasOT ? 'var(--color-danger)' : 'var(--color-success)'
  const spColor = totals.totalSplits > 0 ? 'var(--color-danger)' : 'var(--color-success)'
  const olColor = totals.overLimit > 0 ? 'var(--color-danger)' : 'var(--color-success)'
  const tcColor = totals.totalTerceros > 0 ? 'var(--color-warning)' : 'var(--color-success)'
  const hasData = generated && schedules.length > 0
  const showSims = simsRun && simulations.length === 3
  const showUnassigned = unassignedCount > 0
  const isBestBalanced = bestScenario ? bestScenario.name === 'Balanceado' : false
  const bestBg = isBestBalanced ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'
  const bestBorder = isBestBalanced ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'
  const bestClr = isBestBalanced ? 'var(--color-success)' : 'var(--color-warning)'
  const hasValidationIssues = validationIssues.some(i => !i.passed)
  const showValidation = validationIssues.length > 0

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Spinner size={24} className="animate-spin" style={{ color: 'var(--color-ak-borgona)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Cargando datos...</span>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Warning size={24} style={{ color: 'var(--color-ak-borgona)' }} />
        <span style={{ color: 'var(--color-ak-borgona)' }}>Error: {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarDots size={22} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
            Horarios Automaticos
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Descansos escalonados por equipo con rotacion semanal. Cero turnos partidos. Demanda ajustada por equipo.
          </p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: 'var(--color-ak-borgona)' }}
          >
            <Clock size={16} weight="bold" />
            {generated ? 'Regenerar' : 'Generar Horarios'}
          </button>
          <button
            onClick={handleRunSimulations}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <PlayCircle size={16} weight="bold" />
            Simular Escenarios
          </button>
        </div>
      </div>

      {/* ── Demand Insights ── */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ChartBar size={18} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
            Demanda Historica — Prioridad de Descanso
          </h3>
          <select
            value={selectedDemandTeam}
            onChange={e => setSelectedDemandTeam(e.target.value)}
            className="text-xs rounded-lg px-3 py-1.5 font-medium"
            style={{ background: 'var(--bg-card-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value="Cocina">Cocina (11 personas)</option>
            <option value="Servicio">Servicio</option>
            <option value="Bar">Bar</option>
            <option value="Todos">Todos (promedio)</option>
          </select>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          {selectedDemandTeam === 'Todos'
            ? 'Promedio ponderado de todos los equipos. Cada equipo tiene su propia demanda y prioridades.'
            : selectedDemandTeam === 'Cocina'
              ? 'Cocina: sabado alta demanda (cena, ~25). Mar/Mie estables. Dom/Lun bajos.'
              : selectedDemandTeam === 'Servicio'
                ? 'Servicio: sabado baja demanda (~15). Vie maximo. Jue limitado.'
                : 'Bar: sabado baja demanda (~12). Dom/Lun minimos.'}
        </p>
        <div className="grid grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map(d => {
            const team = selectedDemandTeam === 'Todos' ? 'Cocina' : selectedDemandTeam
            const demand = selectedDemandTeam === 'Todos' ? getGlobalDemand(d) : getTeamDemand(team, d)
            const maxDemand = selectedDemandTeam === 'Todos' ? Math.max(...[0,1,2,3,4,5,6].map(dd => getGlobalDemand(dd))) : getTeamDemand(team, 5)
            const label = selectedDemandTeam === 'Todos'
              ? (d === 5 ? 'Prohibido' : (d === 4 ? 'Limitado' : (getGlobalDemand(d) >= maxDemand * 0.85 ? 'Limitado' : 'Descanso')))
              : getDayLabel(d, team)
            const isFri = d === 5
            const isProhibido = label === 'Prohibido'
            const isLimitado = label === 'Limitado'
            const isDescanso = label === 'Descanso'
            const intensity = Math.min(1, demand / Math.max(maxDemand, 1))
            const r = isProhibido ? 239 : (isLimitado ? Math.round(200 + intensity * 55) : Math.round(160 + intensity * 95))
            const g = isProhibido ? 68 : (isLimitado ? Math.round(150 + intensity * 70) : Math.round(220 - intensity * 60))
            const b2 = isProhibido ? 68 : (isLimitado ? Math.round(50 + intensity * 170) : Math.round(220 - intensity * 180))
            const borderClr = isProhibido ? 'var(--color-danger)' : (isLimitado ? 'var(--color-warning)' : 'var(--color-success)')
            const bgClr = isProhibido ? 'rgba(239,68,68,0.15)' : (isLimitado ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)')
            const txtClr = isProhibido ? 'var(--color-danger)' : (isLimitado ? 'var(--color-warning)' : 'var(--color-success)')
            return (
              <div key={d} className="rounded-lg p-3 text-center" style={{ background: bgClr, borderWidth: 2, borderStyle: 'solid', borderColor: borderClr }}>
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: txtClr }}>{label}</div>
                <div className="text-xs font-bold mt-0.5" style={{ color: txtClr }}>{DAY_FULL[d]}</div>
                <div className="text-xl font-bold mt-1" style={{ color: txtClr }}>{demand}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>colab/dia</div>
                {isProhibido && (
                  <div className="text-[10px] font-bold mt-1 px-1 py-0.5 rounded bg-[var(--color-danger)]/20 text-[var(--color-danger)]">
                    NUNCA
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Per-team summary cards */}
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--bg-card-hover)' }}>
          <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Resumen de Prioridades por Equipo
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {TEAM_NAMES.map(team => {
              const tMax = getTeamDemand(team, 5)
              const sabDemand = getTeamDemand(team, 6)
              const domDemand = getTeamDemand(team, 0)
              const sabLabel = getDayLabel(6, team)
              const sabIsLimitado = sabLabel === 'Limitado'
              const sabIsDescanso = sabLabel === 'Descanso'
              const sabClr = sabIsLimitado ? 'var(--color-warning)' : 'var(--color-success)'
              return (
                <div key={team} className="rounded-lg p-2" style={{ background: 'var(--bg-card)' }}>
                  <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{team}</div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Vie (max):</span>
                      <span className="font-bold" style={{ color: 'var(--color-danger)' }}>{tMax}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Sab:</span>
                      <span className="font-bold" style={{ color: sabClr }}>
                        {sabDemand} — {sabLabel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Dom:</span>
                      <span className="font-bold" style={{ color: 'var(--color-success)' }}>{domDemand} — Descanso</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Team Eligible Days ── */}
      {Object.keys(teamEligibleDays).length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users size={18} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
            Dias de Descanso por Equipo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(teamEligibleDays).map(([team, eligible]) => (
              <div key={team} className="rounded-lg p-3" style={{ background: 'var(--bg-card-hover)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{team}</div>
                <div className="flex flex-wrap gap-1">
                  {eligible.map(e => (
                    <span
                      key={e.day}
                      className="text-[10px] px-2 py-1 rounded-full font-medium"
                      style={{
                        background: SHIFT_COLORS['X'] + '20',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {DAY_NAMES[e.day]} ({(e.share * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Validation Panel ── */}
      {showValidation && (
        <div className="rounded-xl p-4" style={{ background: hasValidationIssues ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${hasValidationIssues ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Scales size={18} weight="bold" style={{ color: hasValidationIssues ? 'var(--color-warning)' : 'var(--color-success)' }} />
            Verificacion de Algoritmo ({validationIssues.filter(i => i.passed).length}/{validationIssues.length} OK)
          </h3>
          <div className="space-y-1.5">
            {validationIssues.map((issue, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs rounded px-2 py-1"
                style={{ background: issue.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}
              >
                {issue.passed
                  ? <CheckCircle size={14} weight="bold" style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                  : <Warning size={14} weight="bold" style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <span className="font-medium" style={{ color: issue.passed ? 'var(--color-success)' : 'var(--color-danger)' }}>{issue.test}:</span>
                  <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{issue.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Horas Extra', value: `${totals.totalOT.toFixed(1)}h`, sub: `${totals.overLimit}/${totals.count} empleados`, color: otColor },
            { label: 'Partidos', value: '0', sub: 'eliminados', color: spColor },
            { label: 'Nocturnas', value: `${totals.totalNight.toFixed(1)}h`, sub: `de ${totals.totalHours.toFixed(0)}h`, color: 'var(--color-warning)' },
            { label: 'Terceros', value: `${totals.totalTerceros}`, sub: formatCOP(totals.tercerosCost) + '/sem', color: tcColor },
            { label: 'Nomina', value: formatCOP(totals.totalCost), sub: 'estimado/sem', color: 'var(--text-primary)' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Coverage + Rest Distribution ── */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Coverage */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={16} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
              Cobertura vs Demanda
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(d => {
                const cov = coverageByDay[d]
                if (!cov) return null
                const deficit = Math.max(0, cov.needed - cov.working)
                const pct = Math.min(100, (cov.working / Math.max(cov.needed, 1)) * 100)
                const isOk = deficit === 0
                const barColor = isOk ? 'var(--color-success)' : (pct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)')
                return (
                  <div key={d} className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-card-hover)' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{DAY_NAMES[d]}</div>
                    <div className="text-lg font-bold mt-1" style={{ color: barColor }}>{cov.working}/{cov.needed}</div>
                    <div className="w-full h-1.5 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full transition-all" style={{ background: barColor, width: `${pct}%` }} />
                    </div>
                    {deficit > 0
                      ? <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--color-warning)' }}>Faltan {deficit}</div>
                      : <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--color-success)' }}>Cubierto</div>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rest distribution */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CalendarDots size={16} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
              Distribucion de Descansos
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(d => {
                const count = restDayDist[d] || 0
                const demand = getTotalDemand(d)
                const barColor = d === 5 ? 'var(--text-muted)' : (count === 0 ? 'var(--color-success)' : '#3b82f6')
                return (
                  <div key={d} className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-card-hover)' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{DAY_NAMES[d]}</div>
                    <div className="text-lg font-bold mt-1" style={{ color: barColor }}>{count}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>dem. {demand}</div>
                  </div>
                )
              })}
            </div>
            {/* Per-team rest breakdown */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Descansos por Equipo</h4>
              <div className="space-y-1">
                {(() => {
                  const teams = new Set(schedules.map(s => s.team))
                  return Array.from(teams).map(team => {
                    const teamScheds = schedules.filter(s => s.team === team)
                    const teamRestDist: Record<number, number> = {}
                    for (let d = 0; d < 7; d++) teamRestDist[d] = 0
                    for (const s of teamScheds) teamRestDist[s.restDay]++
                    return (
                      <div key={team} className="flex items-center gap-2 text-xs">
                        <span className="font-medium" style={{ color: 'var(--text-primary)', minWidth: 80 }}>{team}</span>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4, 5, 6].map(d => {
                            const c = teamRestDist[d] || 0
                            if (c === 0) return null
                            return (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{ background: SHIFT_COLORS['X'] + '20', color: 'var(--text-secondary)' }}
                              >
                                {DAY_NAMES[d]}:{c}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Simulation Comparison ── */}
      {showSims && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ChartBar size={18} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
            Comparacion de Escenarios
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Selecciona un escenario para ver su programacion. Actual: <strong>{activeSimName}</strong> (semana {weekSeedRef.current})
          </p>

          {/* Scenario selector */}
          <div className="flex gap-2 mb-4">
            {simulations.map(sim => {
              const isActive = sim.name === activeSimName
              const btnBg = isActive ? 'var(--color-ak-borgona)' : 'var(--bg-card-hover)'
              const btnClr = isActive ? '#fff' : 'var(--text-secondary)'
              const btnBorder = isActive ? 'none' : '1px solid var(--border)'
              return (
                <button
                  key={sim.name}
                  onClick={() => handleSwitchSimulation(sim.name)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: btnBg, color: btnClr, border: btnBorder }}
                >
                  {sim.name} ({sim.maxWeeklyHours}h)
                </button>
              )
            })}
          </div>

          {/* Metrics table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)' }}>
                  <th className="text-left p-3" style={{ color: 'var(--text-secondary)' }}>Metrica</th>
                  {simulations.map(sim => (
                    <th key={sim.name} className="text-center p-3" style={{ color: 'var(--text-primary)' }}>{sim.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Max h/sem', get: (s: SimulationResult) => `${s.maxWeeklyHours}h` },
                  { label: 'Seguido (S)', get: (s: SimulationResult) => s.allowSeguido ? 'Si' : 'No' },
                  { label: 'Horas totales', get: (s: SimulationResult) => `${s.totalHours.toFixed(0)}h` },
                  { label: 'Horas extra', get: (s: SimulationResult) => `${s.totalOT.toFixed(1)}h`, warn: true },
                  { label: 'Emp. excedidos', get: (s: SimulationResult) => `${s.overLimit}`, warn: true },
                  { label: 'Terceros/sem', get: (s: SimulationResult) => `${s.totalTerceros}`, warn: true },
                  { label: 'Costo terceros', get: (s: SimulationResult) => formatCOP(s.tercerosCost) },
                  { label: 'Costo nomina', get: (s: SimulationResult) => formatCOP(s.totalCost) },
                  { label: 'Costo total', get: (s: SimulationResult) => formatCOP(s.totalCost + s.tercerosCost), highlight: true },
                ].map(row => (
                  <tr key={row.label} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                    {simulations.map(sim => {
                      const val = row.get(sim)
                      const isWarn = row.warn && val !== '0' && val !== '0.0h' && val !== 'No'
                      const valColor = row.highlight ? 'var(--color-ak-borgona)' : (isWarn ? 'var(--color-danger)' : 'var(--text-primary)')
                      const fw = row.highlight ? 700 : (isWarn ? 600 : 500)
                      return (
                        <td key={sim.name} className="text-center p-3" style={{ color: valColor, fontWeight: fw }}>{val}</td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Terceros per day breakdown */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Terceros necesarios por dia</h4>
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-card-hover)' }}>
                  <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{DAY_NAMES[d]}</div>
                  <div className="flex justify-center gap-1 mt-1">
                    {simulations.map(sim => {
                      const t = sim.tercerosByDay[d] || 0
                      const tZero = t === 0
                      return (
                        <span
                          key={sim.name}
                          className="text-[10px] font-bold px-1 rounded"
                          title={`${sim.name}: ${t}`}
                          style={{
                            background: tZero ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                            color: tZero ? 'var(--color-success)' : 'var(--color-warning)',
                          }}
                        >
                          {t}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {simulations.map(sim => (
                <span key={sim.name} className="px-1">{sim.name}</span>
              ))}
            </div>
          </div>

          {/* Best scenario banner */}
          {bestScenario && (
            <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: bestBg, border: `1px solid ${bestBorder}` }}>
              <CheckCircle size={18} weight="bold" style={{ color: bestClr }} />
              <div>
                <span className="text-sm font-medium" style={{ color: bestClr }}>
                  Mejor escenario: {bestScenario.name}
                </span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                  (total {formatCOP(bestScenario.totalCost + bestScenario.tercerosCost)}, {bestScenario.totalOT.toFixed(0)}h extra, {bestScenario.totalTerceros} terceros)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule Grid ── */}
      {hasData && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Horario Semanal — {activeSimName} ({schedules.length} empleados, semana {weekSeedRef.current})
              </h3>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                {withinLimitCount}/{schedules.length} en limite
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(SHIFT_DEFS).filter(([k]) => k !== 'X').map(([code, def]) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ background: SHIFT_COLORS[code] + '20', color: SHIFT_COLORS[code] }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: SHIFT_COLORS[code] }} />
                  {code}: {def.name} ({def.entrada}–{def.salida}, {def.hours}h)
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)' }}>
                  <th className="text-left p-2 sticky left-0 z-10" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>Colaborador</th>
                  <th className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>Desc</th>
                  {DAY_NAMES.map(d => (
                    <th key={d} className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>{d}</th>
                  ))}
                  <th className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>H/Sem</th>
                  <th className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>Extra</th>
                  <th className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>$</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => {
                  const empHasOT = s.totalOvertime > 0
                  const rowBg = empHasOT ? 'rgba(239,68,68,0.05)' : 'transparent'
                  const stickyBg = empHasOT ? rowBg : 'var(--bg-card)'
                  const hrColor = empHasOT ? 'var(--color-danger)' : 'var(--text-primary)'
                  const exColor = empHasOT ? 'var(--color-danger)' : 'var(--color-success)'
                  const exText = empHasOT ? `+${s.totalOvertime.toFixed(1)}` : '-'
                  return (
                    <tr key={s.employeeId} style={{ background: rowBg, borderTop: '1px solid var(--border)' }}>
                      <td className="p-2 sticky left-0 z-10" style={{ background: stickyBg }}>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.nombre}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {s.team}{s.cargo ? ' · ' + s.cargo : ''}
                        </div>
                      </td>
                      <td className="text-center p-2">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)]">
                          {DAY_NAMES[s.restDay]}
                        </span>
                      </td>
                      {s.schedule.map((day, di) => {
                        if (!day) {
                          return (
                            <td key={di} className="text-center p-1">
                              <div className="rounded px-1 py-0.5 text-xs bg-[var(--text-muted)]/15 text-[var(--text-muted)]">
                                Libre
                              </div>
                            </td>
                          )
                        }
                        return (
                          <td key={di} className="text-center p-1">
                            <div className="rounded px-1 py-0.5 text-xs font-medium" style={{ background: SHIFT_COLORS[day.shiftCode] + '25', color: SHIFT_COLORS[day.shiftCode] }}>
                              <div>{day.shiftCode}</div>
                              <div className="text-[10px] opacity-75">{day.entrada}</div>
                            </div>
                          </td>
                        )
                      })}
                      <td className="text-center p-2 font-medium" style={{ color: hrColor }}>{s.totalHours.toFixed(1)}</td>
                      <td className="text-center p-2 font-medium" style={{ color: exColor }}>{exText}</td>
                      <td className="text-center p-2" style={{ color: 'var(--text-secondary)' }}>{formatCOP(s.totalCost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Explanation (shown before generation) ── */}
      {!generated && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <PlayCircle size={18} weight="bold" style={{ color: 'var(--color-ak-borgona)' }} />
            Como Funciona
          </h3>
          <div className="space-y-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            {[
              {
                title: 'Descansos por equipo con rotacion semanal',
                desc: 'Cada equipo tiene sus propios dias elegibles de descanso segun su demanda especifica. Cocina: sabado alta demanda (25 colab por cena), menos descansos ese dia. La rotacion usa la semana ISO como semilla — cada semana los descansos rotan equitativamente entre todos los miembros del equipo.',
              },
              {
                title: 'Cero turnos partidos (P1/P2 eliminados)',
                desc: 'El turno Seguido (S, 10:00–22:00) cubre ambos picos — almuerzo y cena — sin el tiempo muerto del descanso intermedio, eliminando la ineficiencia de los turnos partidos.',
              },
              {
                title: 'Asignacion por perfil de demanda',
                desc: 'Cada dia tiene una distribucion objetivo de turnos. Viernes: mas Seguidos (35%) para cubrir ambos picos. Sabado: enfoque en C, CD y CS (cena). Dom/Lun: turnos cortos (A, CS) para minimizar horas extra.',
              },
              {
                title: 'Minimizacion de horas extra',
                desc: 'Prefiere turnos de 6.5–8h (CS, A, CD, C) sobre Seguido de 10h. Solo asigna S cuando el empleado tiene margen semanal suficiente y el perfil del dia lo requiere.',
              },
              {
                title: 'Calculo de terceros (temporales)',
                desc: 'Cuando los empleados activos no alcanzan la demanda historica, se calculan terceros necesarios por dia. Costo estimado con 30% de recargo sobre tarifa base, 8 horas por dia.',
              },
              {
                title: 'Simulacion de 3 escenarios',
                desc: 'Conservador (max 44h/sem, sin turno S), Balanceado (46h, S en dias pesados) y Agresivo (48h, S mas frecuente). Compara costo total, horas extra y terceros para elegir la estrategia optima.',
              },
              {
                title: 'Verificacion post-asignacion',
                desc: 'Cada ejecucion valida: 1 descanso por empleado, cero viernes de descanso, distribucion equitativa entre equipos, cero turnos partidos, y cobertura minima del 60% vs demanda.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-bold flex-shrink-0" style={{ color: 'var(--color-ak-borgona)' }}>{i + 1}.</span>
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  <p className="text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Unassigned employees warning ── */}
      {showUnassigned && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Warning size={18} weight="bold" style={{ color: 'var(--color-warning)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-warning)' }}>Empleados sin equipo asignado</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {unassignedCount} empleados activos sin equipo. Asignar equipos mejora la precision del algoritmo y reduce la necesidad de terceros.
          </p>
        </div>
      )}
    </div>
  )
}
