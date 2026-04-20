'use client'

import { useState, useEffect, useCallback } from 'react'

export function useDatesWithReservations(centerDate: string, range = 45) {
  const [dates, setDates] = useState<string[]>([])
  const [days, setDays] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dates-with-reservations?center=${centerDate}&range=${range}`)
      if (res.ok) {
        const d = await res.json()
        setDates(d.dates || [])
        setDays(d.days || {})
      }
    } catch {
      // Silently fail — dots are non-critical UI
    } finally {
      setLoading(false)
    }
  }, [centerDate, range])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  return { dates, days, loading }
}