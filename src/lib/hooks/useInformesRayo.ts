'use client'

import { useState, useCallback } from 'react'

export interface InformesRayoData {
  kpis: any
  daily: any[]
  zones: any[]
  staff: any[]
  payments: any[]
  clientSplit: any[]
  comparison: { kpis: any } | null
  period: {
    from: string
    to: string
    zone: string
    compareFrom: string
    compareTo: string
  }
}

export interface InformesRayoState {
  data: InformesRayoData | null
  loading: boolean
  error: string | null
}

export function useInformesRayo() {
  const [data, setData] = useState<InformesRayoData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async (
    from: string,
    to: string,
    zone: string = 'all',
    compareFrom?: string,
    compareTo?: string,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from, to, zone })
      if (compareFrom) params.set('compareFrom', compareFrom)
      if (compareTo) params.set('compareTo', compareTo)
      const res = await fetch(`/api/admin/informes-rayo?${params}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error cargando informe' }))
        throw new Error(err.error || 'Error cargando informe')
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchReport }
}