'use client'

import { useState, useEffect } from 'react'
import type { TrendResponse } from '@/lib/types/analytics'

export function useWeeklyTrends(weeks: number = 8) {
  const [data, setData] = useState<TrendResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/customers/analytics/trends?weeks=${weeks}`, {
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
        setError(err.message || 'Error cargando tendencias')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [weeks])

  return { data, loading, error }
}