'use client'

import { useState, useEffect } from 'react'
import type { VIPInactiveResponse } from '@/lib/types/analytics'

export function useVIPInactive(days: number = 30) {
  const [data, setData] = useState<VIPInactiveResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/customers/analytics/vip-inactive?days=${days}`, {
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
        setError(err.message || 'Error cargando VIPs inactivos')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [days])

  return { data, loading, error }
}