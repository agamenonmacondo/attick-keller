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
  [key: string]: unknown
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentQueryRef = useRef<string | undefined>(undefined)

  const fetchCustomers = useCallback(async (q?: string) => {
    setLoading(true)
    currentQueryRef.current = q
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      const res = await fetch(`/api/admin/customers${params}`)
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
    fetchCustomers(q)
  }, [fetchCustomers])

  const refetch = useCallback(() => {
    fetchCustomers(currentQueryRef.current)
  }, [fetchCustomers])

  // Auto-load recent customers on mount
  useEffect(() => {
    fetchCustomers()
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

  return { customers, loading, search, refetch }
}