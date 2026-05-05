'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { RESTAURANT_ID } from '@/lib/utils/constants'
import { createDebouncedRefetch } from '@/lib/utils/debounceRefetch'
import type { UrgencyLevel } from '@/lib/utils/urgency'

// ─── Multi-reservation timeline entry ──────────────────────────────
interface ReservationTimeline {
  id: string
  status: 'pending' | 'confirmed' | 'pre_paid' | 'seated' | 'completed' | 'no_show' | 'cancelled'
  party_size: number
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  special_requests: string | null
  time_start: string
  time_end: string
  is_current: boolean
  is_past: boolean
  is_upcoming: boolean
}

interface TableItem {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  zone_id: string
  zone_name: string | null
  can_combine: boolean
  combine_group: string | null

  // Timeline of ALL reservations for this table tonight
  reservations: ReservationTimeline[]
  current_reservation: ReservationTimeline | null
  next_reservation: ReservationTimeline | null
  urgency_level: UrgencyLevel

  // Backward compat (derived from current_reservation)
  is_occupied: boolean
  current_reservation_id: string | null
  current_party_size: number | null
  current_customer_name: string | null
  current_time: string | null
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
  unassignedTables: Array<TableItem | Record<string, unknown>>
  combinations: Array<Record<string, unknown>>
  current_time: string  // HH:MM Colombia time when data was fetched
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

  /** Compute per-zone capacity summary — accounts for multi-reservation per table */
  const zoneSummaries = (data?.zones || []).map(zone => {
    const totalSeats = zone.tables.reduce((sum, t) => sum + t.capacity, 0)

    // Count seats based on time-aware status
    // Occupied = currently seated OR seated-upcoming (host manually seated them early)
    const occupiedSeats = zone.tables
      .filter(t => {
        const hasSeatedCurrent = t.reservations?.some((r: any) => r.is_current && r.status === 'seated')
        const hasSeatedUpcoming = t.reservations?.some((r: any) => r.is_upcoming && r.status === 'seated')
        return (hasSeatedCurrent || hasSeatedUpcoming)
      })
      .reduce((sum, t) => sum + (t.current_party_size ?? t.capacity), 0)

    const reservedSeats = zone.tables
      .filter(t => {
        // Reserved = has upcoming reservation that is NOT seated
        if (t.reservations?.some((r: any) => r.is_upcoming && r.status !== 'seated')) return true
        // Also count current reservations that are not seated
        if (t.reservations?.some((r: any) => r.is_current && r.status !== 'seated')) return true
        return false
      })
      .reduce((sum, t) => {
        if (t.next_reservation) return sum + t.next_reservation.party_size
        return sum + (t.current_party_size ?? t.capacity)
      }, 0)

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

export type { Zone, TableItem, OccupancyData, ReservationTimeline }