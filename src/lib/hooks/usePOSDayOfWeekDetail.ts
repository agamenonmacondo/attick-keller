'use client'

import { useState, useEffect, useRef } from 'react'
import { POSDashboardData } from '@/lib/hooks/usePOSDashboard'

export function usePOSDayOfWeekDetail(
  dayOfWeek: number | null,
  zone: string = 'all',
  category: string = 'all',
  from: string = '2026-01-01',
  to: string = '2026-06-30'
) {
  const [data, setData] = useState<POSDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (dayOfWeek === null) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    let cancelled = false

    async function fetchDayOfWeek() {
      setLoading(true)
      setError(null)
      console.log('[POSDayOfWeekDetail] Fetching dayOfWeek:', dayOfWeek, 'from:', from, 'to:', to)
      try {
        const params = new URLSearchParams({
          dayOfWeek: String(dayOfWeek),
          from,
          to,
          zone,
          category,
        })
        const url = `/api/admin/pos-dashboard/day-of-week?${params.toString()}`
        const t0 = Date.now()
        const res = await fetch(url, { signal })
        if (signal.aborted) return
        const elapsed = Date.now() - t0
        console.log('[POSDayOfWeekDetail] Response:', res.status, 'in', elapsed, 'ms')
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (signal.aborted) return
          console.error('[POSDayOfWeekDetail] API error:', res.status, d)
          if (!cancelled) setError(d.error || `Error ${res.status}`)
          return
        }
        const d = await res.json()
        if (signal.aborted) return
        if (!cancelled) {
          console.log('[POSDayOfWeekDetail] Got data, keys:', Object.keys(d).join(','))
          setData(d)
          setError(null)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error('[POSDayOfWeekDetail] Fetch error:', err)
        if (!cancelled) setError('Error de conexion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDayOfWeek()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [dayOfWeek, zone, category, from, to])

  return { data, loading, error }
}