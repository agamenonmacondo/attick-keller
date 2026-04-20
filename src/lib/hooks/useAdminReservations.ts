'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'

interface ReservationItem {
  id: string; date: string; time_start: string; time_end: string; party_size: number
  status: string; source: string; special_requests: string | null; customer_id: string
  table_id: string | null; created_at: string
  customers: { id: string; email: string | null; full_name: string | null; phone: string | null } | null
  zone_name: string | null; [key: string]: unknown
}

export function useAdminReservations(date: string, statusFilter: string) {
  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date, limit: '100' })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/reservations?${params}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setReservations(d.reservations || []); setTotal(d.total || 0); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [date, statusFilter])

  // Initial fetch + 5-minute fallback polling
  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 300000) // 5-minute fallback
    return () => clearInterval(interval)
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-reservations')
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
  return { reservations, total, loading, error, refetch }
}