'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { RESTAURANT_ID } from '@/lib/utils/constants'
import { createDebouncedRefetch } from '@/lib/utils/debounceRefetch'

interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
  tables: Array<{
    id: string
    number: string
    capacity: number
    is_occupied: boolean
    current_reservation_id: string | null
    current_party_size: number | null
    current_customer_name: string | null
    current_time: string | null
    can_combine: boolean
    combine_group: string | null
  }>
}

interface OccupancyData {
  zones: Zone[]
  unassignedTables: Array<Record<string, unknown>>
  combinations: Array<Record<string, unknown>>
}

export function useHostOccupancy() {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch(`/api/admin/occupancy?date=${today}`)
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
      .channel('host-occupancy')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      }, () => {
        debouncedRefetch()
      })
      .subscribe()

    const interval = setInterval(fetchData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchData, debouncedRefetch])

  return { data, loading, refetch: fetchData }
}