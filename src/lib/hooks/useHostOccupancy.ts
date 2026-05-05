'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { RESTAURANT_ID } from '@/lib/utils/constants'
import { createDebouncedRefetch } from '@/lib/utils/debounceRefetch'

interface TableItem {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
  can_combine: boolean
  combine_group: string | null
  reservation_status: string | null
}

interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
  tables: TableItem[]
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
    const { getColombiaDate } = await import('@/lib/utils/date')
    const today = getColombiaDate()
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

  /** Compute per-zone capacity summary */
  const zoneSummaries = (data?.zones || []).map(zone => {
    const totalSeats = zone.tables.reduce((sum, t) => sum + t.capacity, 0)
    const occupiedSeats = zone.tables
      .filter(t => t.is_occupied && t.reservation_status === 'seated')
      .reduce((sum, t) => sum + (t.current_party_size ?? t.capacity), 0)
    const reservedSeats = zone.tables
      .filter(t => t.is_occupied && t.reservation_status !== 'seated')
      .reduce((sum, t) => sum + (t.current_party_size ?? t.capacity), 0)
    const availableSeats = totalSeats - occupiedSeats - reservedSeats
    const occupancyPercent = totalSeats > 0 ? Math.round(((occupiedSeats + reservedSeats) / totalSeats) * 100) : 0

    return {
      id: zone.id,
      name: zone.name,
      totalSeats,
      occupiedSeats,
      reservedSeats,
      availableSeats,
      occupancyPercent,
    }
  })

  /** Compute overall quick stats */
  const quickStats = {
    totalCapacity: zoneSummaries.reduce((s, z) => s + z.totalSeats, 0),
    occupied: zoneSummaries.reduce((s, z) => s + z.occupiedSeats, 0),
    available: zoneSummaries.reduce((s, z) => s + z.availableSeats, 0),
    reserved: zoneSummaries.reduce((s, z) => s + z.reservedSeats, 0),
  }

  return { data, loading, refetch: fetchData, zoneSummaries, quickStats }
}

export type { Zone, TableItem, OccupancyData }