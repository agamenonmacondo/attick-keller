'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ──

export interface Employee {
  id: string
  nombre: string
  cargo: string
  team: string
  activo: boolean
  kinder: boolean
  salario?: number
}

export interface Team {
  id: string
  nombre: string
  descripcion?: string
}

export interface TurnoConfig {
  id: string
  code: string
  name: string
  entrada?: string
  salida?: string
  day_index?: number
  recargo?: number
}

export interface Schedule {
  id: string
  employee_id: string
  week_str: string
  day_index: number
  turno: string
  entrada?: string
  salida?: string
}

export interface Param {
  id: string
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}

export interface ProductMixItem {
  id: string
  fecha: string
  restaurante?: string
  total_ventas: number
  total_costo: number
  total_items: number
  productos: ProductItem[]
}

export interface ProductItem {
  clave: string
  descripcion?: string
  grupo?: string
  cantidad: number
  venta_total: number
  costo_total: number
  pct_costo?: number
}

export interface Venta {
  id: string
  fecha: string
  restaurante?: string
  total?: number
  propinas?: number
  cheques?: number
}

// ── Hours calculation ──

export interface CalcHours {
  total: number
  diurnas: number
  nocturnas: number
  rn: number
  extDiur: number
  extNoct: number
  domDiur: number
  domNoct: number
}

export function calcHours(entrada: string | null | undefined, salida: string | null | undefined, dayIndex: number): CalcHours {
  if (!entrada || !salida) return { total: 0, diurnas: 0, nocturnas: 0, rn: 0, extDiur: 0, extNoct: 0, domDiur: 0, domNoct: 0 }

  const [hE, mE] = entrada.split(':').map(Number)
  const [hS, mS] = salida.split(':').map(Number)
  let entMin = hE * 60 + mE
  let salMin = hS * 60 + mS
  if (salMin <= entMin) salMin += 1440

  const totalMin = salMin - entMin

  // Count nocturnal minutes (7pm-6am = 19:00-6:00)
  let noctMin = 0
  for (let i = 0; i < totalMin; i++) {
    const h = Math.floor((entMin + i) / 60) % 24
    if (h >= 19 || h < 6) noctMin++
  }

  const diurMin = totalMin - noctMin
  const noctHours = noctMin / 60

  // Recargo nocturno: hours between 7pm-6am with extra 35%
  const jornadaMin = 44 * 60 / 6 // daily expected (44h/6 days = 7.33h/day)
  const jtMins = Math.min(totalMin, jornadaMin) // jornadas within day
  const extMins = totalMin > jornadaMin ? totalMin - jornadaMin : 0

  // Split jornada into diurnal/nocturnal portions
  const jtDiur = Math.min(jtMins, diurMin)
  const jtNoct = jtMins - jtDiur

  // RN from jornada portion
  const rn = jtNoct * 0.35

  // Extras
  const isDom = dayIndex === 0
  let extDiur = 0, extNoct = 0, domDiur = 0, domNoct = 0

  if (extMins > 0) {
    const extDiurMin = Math.min(extMins, Math.max(0, diurMin - jtDiur) + extMins * (diurMin / (totalMin || 1)))
    // Simplified: proportion extra diurnal vs nocturnal
    const diurRatio = totalMin > 0 ? diurMin / totalMin : 0.5
    if (isDom) {
      domDiur = extMins * diurRatio / 60
      domNoct = extMins * (1 - diurRatio) / 60
    } else {
      extDiur = extMins * diurRatio / 60
      extNoct = extMins * (1 - diurRatio) / 60
    }
  } else if (isDom && !extMins) {
    // Whole shift is domingo
    domDiur = diurMin / 60
    domNoct = noctHours
  }

  return {
    total: totalMin / 60,
    diurnas: diurMin / 60,
    nocturnas: noctHours,
    rn: rn / 60,
    extDiur,
    extNoct,
    domDiur,
    domNoct,
  }
}

export function calcCost(hours: CalcHours): number {
  const salMin = 1_575_500 / 30 / 7.33 // hourly rate
  const horaOrd = salMin
  const rn = horaOrd * hours.rn * 1.35
  const hed = horaOrd * hours.extDiur * 1.25
  const hen = horaOrd * hours.extNoct * 1.75
  const hdd = horaOrd * hours.domDiur * 1.75
  const hdn = horaOrd * hours.domNoct * 2.10
  return horaOrd * hours.diurnas + rn + hed + hen + hdd + hdn
}

export function formatCOP(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + Math.round(n).toLocaleString('es-CO')
  return '$' + Math.round(n).toLocaleString('es-CO')
}

// ── Hook ──

interface RodriData {
  loading: boolean
  error: string | null
  employees: Employee[]
  teams: Team[]
  turnosConfig: TurnoConfig[]
  schedules: Schedule[]
  params: Param[]
  productMix: ProductMixItem[]
  ventas: Venta[]
  refetch: () => void
}

export function useRodriData(): RodriData {
  const [data, setData] = useState<RodriData>({
    loading: true,
    error: null,
    employees: [],
    teams: [],
    turnosConfig: [],
    schedules: [],
    params: [],
    productMix: [],
    ventas: [],
    refetch: () => {},
  })

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/admin/rodri?action=all')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error del servidor' }))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const json = await res.json()
      setData({
        loading: false,
        error: null,
        employees: json.employees || [],
        teams: json.teams || [],
        turnosConfig: json.turnosConfig || [],
        schedules: json.schedules || [],
        params: json.params || [],
        productMix: json.productMix || [],
        ventas: json.ventas || [],
        refetch: fetchData,
      })
    } catch (err) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
        refetch: fetchData,
      }))
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return data
}