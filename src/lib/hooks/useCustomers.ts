'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'

interface CustomerRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  loyalty_tier: string
  total_visits: number
  last_visit_date: string | null
  created_at?: string | null
  [key: string]: unknown
}

interface FetchOptions {
  q?: string
  from?: string
  to?: string
  dateField?: string
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentFiltersRef = useRef<FetchOptions>({})

  const fetchCustomers = useCallback(async (opts: FetchOptions = {}) => {
    setLoading(true)
    currentFiltersRef.current = opts
    try {
      const params = new URLSearchParams()
      if (opts.q) params.set('q', opts.q)
      if (opts.from) params.set('from', opts.from)
      if (opts.to) params.set('to', opts.to)
      if (opts.dateField) params.set('dateField', opts.dateField)
      const query = params.toString()
      const res = await fetch(`/api/admin/customers${query ? `?${query}` : ''}`)
      if (res.ok) {
        const d = await res.json()
        setCustomers(d.customers || [])
      } else {
        setCustomers([])
      }
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback((q: string) => {
    fetchCustomers({ q })
  }, [fetchCustomers])

  const refetch = useCallback(() => {
    fetchCustomers(currentFiltersRef.current)
  }, [fetchCustomers])

  // Auto-load recent customers on mount
  useEffect(() => {
    const id = setTimeout(() => fetchCustomers(), 0)
    return () => clearTimeout(id)
  }, [fetchCustomers])

  // Realtime subscription for customer changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-customers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `restaurant_id=eq.${RESTAURANT_ID}` },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => refetch(), 300)
        },
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { customers, loading, search, refetch, fetchCustomers }
}