'use client'

import { useState, useCallback } from 'react'

interface CustomerDetailData {
  customer: { id: string; phone: string; email: string | null; full_name: string | null; preferences: Record<string, unknown> | null; notes: string | null; created_at: string }
  stats: { total_visits: number; total_spent: number; last_visit_date: string | null; no_show_count: number; is_recurring: boolean; loyalty_tier: string } | null
  visits: Array<Record<string, unknown>>
  reservations: Array<Record<string, unknown>>
}

export function useCustomerDetail() {
  const [data, setData] = useState<CustomerDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = useCallback(async (customerId: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`)
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      const d = await res.json(); setData(d)
    } catch { setError('Error de conexion') } finally { setLoading(false) }
  }, [])

  const clear = useCallback(() => { setData(null); setError(null) }, [])
  return { data, loading, error, fetchCustomer, clear }
}