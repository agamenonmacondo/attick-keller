'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Original biometric types ──
export interface NominaStaffSummary {
  id: string
  cedula: string
  nombre_completo: string
  pos_staff_id: string | null
  es_medio_tiempo: boolean
  dias_trabajados: number
  ho: string
  hed: string
  hen: string
  hdd: string
  hdn: string
  rn: string
  total_horas: string
  horas_extras: number
  dominicales: number
  hoHours: string
  totalHours: string
}

export interface NominaResumen {
  totalEmpleados: number
  totalDiasRegistros: number
  totalHorasOrdinarias: string
  totalHorasExtras: string
  totalHorasDominicales: string
  totalRecargoNocturno: string
  totalHoras: string
  totalHorasExtrasCount: number
  promedioTurno: string
  pctExtras: string
  hoMins: number
  hedMins: number
  henMins: number
  hddMins: number
  hdnMins: number
  rnMins: number
}

export interface NominaStaffDetail {
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
  total_horas: string
  ho: string
  hed: string
  hen: string
  hdd: string
  hdn: string
  rn: string
  horas_extras: number
  es_dominical: boolean
  cl75: string | null
  shift_number: number
}

export interface NominaStaffPosData {
  totalRevenue: number
  totalPropina: number
  totalCheques: number
  avgTicket: number
  productivity: number
}

export interface NominaPeriodo {
  from: string
  to: string
}

export interface DailyBreakdown {
  fecha: string
  diaSemana: string
  personas: number
  horasTotal: number
  horasPromedio: number
}

export interface WeekdayAvg {
  dia: string
  avgPersonas: number
  avgHoras: number
  count: number
}

export type NominaView = 'summary' | 'detail'

// ── Contable (new) types ──
export interface NominaContablePeriodo {
  id: string
  periodo: string
  fecha_inicio: string
  fecha_fin: string
  sede: string
  estado: string
  total_devengado: number
  total_deducciones: number
  total_neto: number
  created_at: string
}

export interface NominaContableDetalle {
  id: string
  periodo_id: string
  staff_id: string
  sede: string
  dias_laborados: number
  salario_basico: number
  salario_devengado: number
  auxilio_transporte: number
  propinas_prometido_75_85: number
  propinas_prometido_75: number
  auxilio_no_salarial: number
  recargos_he_rn_rd: number
  propinas: number
  total_devengado: number
  salud_empleado: number
  pension_empleado: number
  pagos_realizados: number
  prestamos_consumos: number
  total_deducciones: number
  neto_a_pagar: number
  ibc: number
  nombre_completo: string
  cargo: string
  cedula: string
}

export interface NominaContableResumen {
  total_devengado: number
  total_deducciones: number
  total_neto: number
  total_propinas: number
  total_salario_devengado: number
  total_salud: number
  total_pension: number
  total_auxilio_transporte: number
  total_recargos: number
  total_pagos_realizados: number
  total_prestamos: number
  empleados: number
}

export interface NominaContablePropinas {
  id: string
  periodo_id: string
  sede: string
  total_propinas_ventas: number
  prometidos_100_pct: number
  propina_para_rep: number
  dias_laborados_total: number
  valor_dia_propina: number
}

export interface NominaContableHERecargo {
  id: string
  periodo_id: string
  staff_id: string
  sede: string
  hed_horas: number
  hed_valor: number
  hed_total: number
  hen_horas: number
  hen_valor: number
  hen_total: number
  rn_horas: number
  rn_valor_hora: number
  rn_total: number
  rd_diurno_horas: number
  rd_diurno_valor: number
  rd_diurno_total: number
  rd_nocturno_horas: number
  rd_nocturno_valor: number
  rd_nocturno_total: number
  hedd_horas: number
  hedd_valor: number
  hedd_total: number
  hddn_horas: number
  hddn_valor: number
  hddn_total: number
  total_recargos: number
  nombre_completo: string
  cargo: string
  cedula: string
}

export interface NominaContableHERecargoTotals {
  hed_total: number
  hen_total: number
  rn_total: number
  rd_diurno_total: number
  rd_nocturno_total: number
  hedd_total: number
  hddn_total: number
  total_recargos: number
}

export interface NominaContableProvision {
  id: string
  periodo_id: string
  staff_id: string
  sede: string
  provisiones_salud: number
  provisiones_sociales: number
  base_vacaciones: number
  salud_empleado: number
  pension_empleado: number
  pension_empleador: number
  arl_empleador: number
  caja_empleador: number
  cesantias_empleador: number
  prima_empleador: number
  vacaciones_empleador: number
  intereses_cesantias_empleador: number
  total_provision_empleador: number
  nombre_completo: string
  cargo: string
  cedula: string
}

export interface NominaContableNovedad {
  id: string
  periodo_id: string
  staff_id: string
  sede: string
  tipo: string
  observacion: string
  fecha_inicio: string
  fecha_fin: string | null
  dias: number | null
  aplicada: boolean
  nombre_completo: string
  cargo: string
  cedula: string
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(lastDay).padStart(2, '0')}` }
}

// ── Original hook ──
export function useNomina(from?: string, to?: string) {
  const f = from
  const t = to
  const [data, setData] = useState<{
    periodo: NominaPeriodo
    periodosDisponibles: { id: string; periodo: string; sede: string; fecha_inicio: string; fecha_fin: string }[]
    resumen: NominaResumen
    staff: NominaStaffSummary[]
    dailyBreakdown: DailyBreakdown[]
    weekdayAvg: WeekdayAvg[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [staffDetail, setStaffDetail] = useState<{
    staff: { id: string; cedula: string; nombre_completo: string; pos_staff_id: string | null; es_medio_tiempo: boolean }
    totals: Record<string, any>
    daily: NominaStaffDetail[]
    byWeekDay: Record<string, { count: number; hoMins: number; totalMins: number }>
    posData: NominaStaffPosData | null
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (f) params.set('from', f)
      if (t) params.set('to', t)
      const res = await fetch(`/api/admin/nomina?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [f, t])

  const fetchStaffDetail = useCallback(async (staffId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setSelectedStaffId(staffId)
    try {
      const params = new URLSearchParams()
      if (f) params.set('from', f)
      if (t) params.set('to', t)
      params.set('action', 'staff_detail')
      params.set('staff_id', staffId)
      const res = await fetch(`/api/admin/nomina?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const json = await res.json()
      setStaffDetail(json)
    } catch (e: any) {
      setDetailError(e.message)
    } finally {
      setDetailLoading(false)
    }
  }, [f, t])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    data,
    loading,
    error,
    refetch: fetchSummary,
    selectedStaffId,
    staffDetail,
    detailLoading,
    detailError,
    fetchStaffDetail,
    closeDetail: () => { setSelectedStaffId(null); setStaffDetail(null) },
  }
}

// ── Contable hook ──
export function useNominaContable() {
  const [periodos, setPeriodos] = useState<NominaContablePeriodo[]>([])
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('')
  const [selectedSede, setSelectedSede] = useState<string>('C75')
  const [detalle, setDetalle] = useState<NominaContableDetalle[]>([])
  const [resumen, setResumen] = useState<NominaContableResumen | null>(null)
  const [propinasPeriodo, setPropinasPeriodo] = useState<NominaContablePropinas | null>(null)
  const [heRecargos, setHERecargos] = useState<NominaContableHERecargo[]>([])
  const [heRecargosTotals, setHERecargosTotals] = useState<NominaContableHERecargoTotals | null>(null)
  const [provisiones, setProvisiones] = useState<NominaContableProvision[]>([])
  const [provisionesTotals, setProvisionesTotals] = useState<Record<string, number> | null>(null)
  const [novedades, setNovedades] = useState<NominaContableNovedad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<'detalle' | 'he-recargos' | 'provisiones' | 'novedades' | 'propinas'>('detalle')

  // Load periodos on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/nomina?action=contable')
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const json = await res.json()
        setPeriodos(json.periodos || [])
        if (json.periodos?.length > 0 && !selectedPeriodo) {
          setSelectedPeriodo(json.periodos[0].periodo)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load detalle when periodo/sede changes
  useEffect(() => {
    if (!selectedPeriodo || !selectedSede) return
    async function loadDetalle() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/nomina?action=contable&periodo=${encodeURIComponent(selectedPeriodo)}&sede=${encodeURIComponent(selectedSede)}`)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const json = await res.json()
        setDetalle(json.detalle || [])
        setResumen(json.resumen || null)
        setPropinasPeriodo(json.propinas || null)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadDetalle()
  }, [selectedPeriodo, selectedSede])

  // Load sub-tab data when tab changes
  useEffect(() => {
    if (!selectedPeriodo || !selectedSede) return

    // Find periodo_id from periodos list
    const periodoObj = periodos.find(p => p.periodo === selectedPeriodo && p.sede === selectedSede)
    if (!periodoObj) return

    const periodoId = periodoObj.id

    async function loadSubData() {
      try {
        if (subTab === 'he-recargos') {
          const res = await fetch(`/api/admin/nomina/${periodoId}/he-recargos?sede=${encodeURIComponent(selectedSede)}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const json = await res.json()
          setHERecargos(json.data || [])
          setHERecargosTotals(json.totals || null)
        } else if (subTab === 'provisiones') {
          const res = await fetch(`/api/admin/nomina/${periodoId}/provisiones?sede=${encodeURIComponent(selectedSede)}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const json = await res.json()
          setProvisiones(json.data || [])
          setProvisionesTotals(json.totals || null)
        } else if (subTab === 'novedades') {
          const res = await fetch(`/api/admin/nomina/${periodoId}/novedades?sede=${encodeURIComponent(selectedSede)}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const json = await res.json()
          setNovedades(json.data || [])
        } else if (subTab === 'propinas') {
          const res = await fetch(`/api/admin/nomina/${periodoId}/propinas?sede=${encodeURIComponent(selectedSede)}`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const json = await res.json()
          // propinas returns array, find the one matching our sede
          const propData = json.data?.find((p: any) => p.sede === selectedSede) || null
          setPropinasPeriodo(propData)
        }
      } catch (e: any) {
        console.error('Error loading sub-tab data:', e.message)
      }
    }
    loadSubData()
  }, [subTab, selectedPeriodo, selectedSede, periodos])

  // Derive available sedes from periodos for the selected periodo
  const sedesDisponibles = [...new Set(periodos.filter(p => p.periodo === selectedPeriodo).map(p => p.sede))]

  return {
    periodos,
    selectedPeriodo,
    setSelectedPeriodo,
    selectedSede,
    setSelectedSede,
    sedesDisponibles,
    detalle,
    resumen,
    propinasPeriodo,
    heRecargos,
    heRecargosTotals,
    provisiones,
    provisionesTotals,
    novedades,
    subTab,
    setSubTab,
    loading,
    error,
  }
}