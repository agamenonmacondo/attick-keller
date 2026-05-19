'use client'

import { useState, useEffect } from 'react'
import type { NoShowTodayResponse } from '@/lib/types/analytics'

export function useNoShowToday(date?: string) {
  const [data, setData] = useState<NoShowTodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)

    setLoading(true)
    fetch(`/api/admin/customers/analytics/no-show-today?${params.toString()}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Error cargando alertas de no-show')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [date])

  return { data, loading, error }
}