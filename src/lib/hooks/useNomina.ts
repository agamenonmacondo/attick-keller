'use client'

import { useState, useEffect, useCallback } from 'react'

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

export function useNomina(from: string, to: string) {
  const [data, setData] = useState<{
    periodo: NominaPeriodo
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
      const res = await fetch(`/api/admin/nomina?from=${from}&to=${to}`)
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
  }, [from, to])

  const fetchStaffDetail = useCallback(async (staffId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setSelectedStaffId(staffId)
    try {
      const res = await fetch(`/api/admin/nomina?from=${from}&to=${to}&action=staff_detail&staff_id=${staffId}`)
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
  }, [from, to])

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