'use client'

import { useState, useEffect, useCallback } from 'react'

export function useDatesWithReservations(centerDate: string, range = 7) {
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dates-with-reservations?center=${centerDate}&range=${range}`)
      if (res.ok) {
        const d = await res.json()
        setDates(d.dates || [])
      }
    } catch {
      // Silently fail — dots are non-critical UI
    } finally {
      setLoading(false)
    }
  }, [centerDate, range])

  useEffect(() => {
    setLoading(true)
    fetchDates()
  }, [fetchDates])

  return { dates, loading }
}