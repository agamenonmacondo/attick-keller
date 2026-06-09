'use client'

import { useState, useCallback } from 'react'
import type { ReservationLog } from '@/lib/utils/reservation-logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Hook to fetch and display reservation audit trail (bitácora).
 */
export function useReservationLogs(reservationId: string | null) {
  const [logs, setLogs] = useState<ReservationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!reservationId) {
      setLogs([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/reservation_logs?reservation_id=eq.${reservationId}&order=created_at.asc`,
        {
          headers: {
            apikey: ANON_KEY!,
            Authorization: `Bearer ${ANON_KEY!}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.status}`)
      }

      const data = await response.json()
      setLogs(data)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [reservationId])

  return { logs, loading, error, fetchLogs }
}