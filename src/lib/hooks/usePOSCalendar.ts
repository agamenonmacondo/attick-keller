'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

export interface CalendarDayData {
  date: string
  revenue: number
  cheques: number
  propina: number
  personas: number
}

export function usePOSCalendar(zone: string = 'all') {
  const [dailyTrend, setDailyTrend] = useState<CalendarDayData[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('zone', zone)
    return p.toString()
  }, [zone])

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal
    let cancelled = false

    async function fetchCalendar() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/pos-calendar?${params}`, { signal })
        if (signal.aborted) return
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (!cancelled) setError(d.error || 'Error cargando calendario')
          return
        }
        const d = await res.json()
        if (signal.aborted) return
        if (!cancelled) {
          setDailyTrend(d.dailyTrend || [])
          setAvailableMonths(d.availableMonths || [])
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        if (!cancelled) setError('Error de conexion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCalendar()
    return () => { cancelled = true; controller.abort() }
  }, [params])

  return { dailyTrend, availableMonths, loading, error }
}