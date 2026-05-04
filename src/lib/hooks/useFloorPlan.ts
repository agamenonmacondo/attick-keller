'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'

// ── Types ──────────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'reserved' | 'seated'

export interface TableWithPosition {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  position_x: number | null
  position_y: number | null
  zone_id: string | null
  can_combine: boolean | null
  status: TableStatus
  reservation_id: string | null
  party_size: number | null
  customer_name: string | null
  time_range: string | null
}

export interface FloorPlanZone {
  id: string
  name: string
  tables: TableWithPosition[]
}

export interface FloorPlanFloor {
  floor_num: number
  name: string
  image_url: string
  zones: FloorPlanZone[]
}

export interface UnpositionedTable {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  position_x: number | null
  position_y: number | null
  zone_id: string | null
  zone_name: string | null
}

interface FloorPlanData {
  floors: FloorPlanFloor[]
  unpositionedTables: UnpositionedTable[]
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useFloorPlan(date?: string) {
  const [data, setData] = useState<FloorPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dateParam = date || new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/floorplan?date=${dateParam}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Error')
        return
      }
      const d = await res.json()
      setData(d)
      setError(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [dateParam])

  // Initial fetch + 5-minute fallback polling
  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Realtime subscription for reservation changes
  useEffect(() => {
    const channel = supabase
      .channel('floorplan-occupancy')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${RESTAURANT_ID}`,
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => fetchData(), 500)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const refetch = useCallback(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  return {
    floors: data?.floors ?? [],
    unpositionedTables: data?.unpositionedTables ?? [],
    loading,
    error,
    refetch,
  }
}