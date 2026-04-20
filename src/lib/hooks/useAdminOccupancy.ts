'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface OccupancyData { zones: Array<Record<string, unknown>>; unassignedTables: Array<Record<string, unknown>>; combinations: Array<Record<string, unknown>> }

export function useAdminOccupancy(date: string) {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/occupancy?date=${date}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setData(d); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [date])

  useEffect(() => { setLoading(true); fetchData(); intervalRef.current = setInterval(fetchData, 60000); return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [fetchData])
  const refetch = useCallback(() => { setLoading(true); fetchData() }, [fetchData])
  return { data, loading, error, refetch }
}