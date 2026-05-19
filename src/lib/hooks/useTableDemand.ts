'use client'

import { useState, useEffect } from 'react'
import type { TableDemandComparison } from '@/lib/types/analytics'

export function useTableDemand() {
  const [data, setData] = useState<TableDemandComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/customers/analytics/table-demand', {
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
        setError(err.message || 'Error cargando demanda de mesas')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}