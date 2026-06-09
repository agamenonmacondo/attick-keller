'use client'

import { useState, useEffect, useRef } from 'react'
import { POSDashboardData } from '@/lib/hooks/usePOSDashboard'

export function usePOSDayOfWeekDetail(
  dayOfWeek: number | null,
  zone: string = 'all',
  category: string = 'all'
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
      try {
        const params = new URLSearchParams({
          dayOfWeek: String(dayOfWeek),
          from: '2026-01-01',
          to: '2026-06-30',
          zone,
          category,
        })
        const url = `/api/admin/pos-dashboard/day-of-week?${params.toString()}`
        const res = await fetch(url, { signal, next: { revalidate: 300 } } as any)
        if (signal.aborted) return
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (signal.aborted) return
          console.error('[POSDayOfWeekDetail] API error:', res.status, d)
          if (!cancelled) setError(d.error || 'Error cargando datos')
          return
        }
        const d = await res.json()
        if (signal.aborted) return
        if (!cancelled) {
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
  }, [dayOfWeek, zone, category])

  return { data, loading, error }
}