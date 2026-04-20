'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'

interface DashboardData {
  reservations: Array<Record<string, unknown>>
  todayStats: { total: number; pending: number; confirmed: number; seated: number; pre_paid: number; completed: number; cancelled: number; no_show: number; totalGuests: number; seatedGuests: number }
  occupancy: { totalCapacity: number; occupiedCapacity: number; utilizationPercent: number; totalTables: number; occupiedTables: number; byZone: Array<Record<string, unknown>> }
}

export function useAdminDashboard(date: string) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dashboard?date=${date}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error cargando datos'); return }
      const d = await res.json(); setData(d); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [date])

  // Initial fetch + 5-minute fallback polling
  useEffect(() => {
    setLoading(true)
    fetchData()
    intervalRef.current = setInterval(fetchData, 300000) // 5-minute fallback
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard')
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