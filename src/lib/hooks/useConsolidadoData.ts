'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface HoraMetrica {
  hora: number
  cheques: number
  personas: number
  revenue: number
  ticket_prom: number
  service_time_min: number
}

export interface ServiceTimePct {
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface ProductoHora {
  hora: number
  producto: string
  categoria: string
  cantidad: number
  revenue: number
}

export interface Acompanante {
  top_product: string
  companion: string
  veces_juntos: number
  rank: number
}

export interface TopFranja {
  producto: string
  categoria: string
  cantidad: number
  revenue: number
  companions: { name: string; veces: number }[]
}

export interface DiaSemana {
  date: string
  dow: number
  cheques: number
  revenue: number
}

export interface ConsolidadoResumen {
  totalCheques: number
  totalRevenue: number
  totalPersonas: number
  avgTicket: number
  avgServiceTime: number
  capacidadPct: number
  capacidadChequesDia: number
  capacidadMesas: number
  asientos: number
  almuerzoCheques: number
  tardeCheques: number
  cenaCheques: number
  almuerzoCap: number
  tardeCap: number
  cenaCap: number
}

export interface ConsolidadoData {
  date: string
  hourly: HoraMetrica[]
  serviceTime: ServiceTimePct
  productos: ProductoHora[]
  companions: Acompanante[]
  topPorFranja: Record<string, TopFranja[]>
  semana: DiaSemana[]
  resumen: ConsolidadoResumen
}

export function useConsolidadoData(date: string) {
  const [data, setData] = useState<ConsolidadoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    setLoading(true)
    setError(null)

    try {
      const url = `/api/admin/operacion/consolidado?date=${date}`
      const res = await fetch(url, { signal })
      if (signal.aborted) return

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (signal.aborted) return
        setError(d.error || 'Error cargando datos')
        return
      }

      const d = await res.json()
      if (signal.aborted) return
      setData(d)
      setError(null)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError('Error de conexion')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}
