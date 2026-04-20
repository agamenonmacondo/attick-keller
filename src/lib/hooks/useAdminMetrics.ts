'use client'

import { useState, useEffect, useCallback } from 'react'

interface MetricsData {
  peakHours: Array<{ hour: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  conversionRate: number
  conversion: { pending: number; confirmed: number; rate: number }
  noShowRate: number
  noShow: { total: number; no_shows: number; rate: number }
  avgPartySize: number
  dailyTrend: Array<{ date: string; total: number; confirmed: number }>
}

export function useAdminMetrics() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metrics')
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setData(d); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}