'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'

interface OccupancyData { zones: Array<Record<string, unknown>>; unassignedTables: Array<Record<string, unknown>>; combinations: Array<Record<string, unknown>> }

export function useAdminOccupancy(date: string) {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/occupancy?date=${date}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setData(d); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [date])

  // Initial fetch + 5-minute fallback polling
  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 300000) // 5-minute fallback
    return () => clearInterval(interval)
  }, [fetchData])

  // Realtime subscription for reservations changes that affect occupancy
  useEffect(() => {
    const channel = supabase
      .channel('admin-occupancy')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${RESTAURANT_ID}` },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => fetchData(), 300)
        },
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const refetch = useCallback(() => { setLoading(true); fetchData() }, [fetchData])
  return { data, loading, error, refetch }
}