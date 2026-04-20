'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date, limit: '100' })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/reservations?${params}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setReservations(d.reservations || []); setTotal(d.total || 0); setError(null)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [date, statusFilter])

  useEffect(() => { setLoading(true); fetchData(); intervalRef.current = setInterval(fetchData, 30000); return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [fetchData])
  const refetch = useCallback(() => { setLoading(true); fetchData() }, [fetchData])
  return { reservations, total, loading, error, refetch }
}