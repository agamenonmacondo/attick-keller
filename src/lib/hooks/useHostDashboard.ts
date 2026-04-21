'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { RESTAURANT_ID } from '@/lib/utils/constants'
import { createDebouncedRefetch } from '@/lib/utils/debounceRefetch'

interface DashboardData {
  reservations: Array<Record<string, unknown>>
  todayStats: {
    total: number
    pending: number
    confirmed: number
    seated: number
    pre_paid: number
    completed: number
    cancelled: number
    no_show: number
    totalGuests: number
    seatedGuests: number
  }
  occupancy: {
    totalCapacity: number
    occupiedCapacity: number
    utilizationPercent: number
    capacityPercent: number
    totalTables: number
    occupiedTables: number
    byZone: Array<Record<string, unknown>>
  }
}

export function useHostDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch(`/api/admin/dashboard?date=${today}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedRefetch = useRef(createDebouncedRefetch(fetchData, 300)).current

  useEffect(() => {
    fetchData()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('host-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      }, () => {
        debouncedRefetch()
      })
      .subscribe()

    // Fallback polling every 30 seconds for host (fresher data needed)
    const interval = setInterval(fetchData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchData, debouncedRefetch])

  return { data, loading, refetch: fetchData }
}