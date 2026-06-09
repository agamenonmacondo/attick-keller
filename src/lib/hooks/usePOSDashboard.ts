'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

export interface POSDashboardFilters {
  zone: string        // 'all' | 'Tipi' | 'Attic' | 'Chispas'
  category: string    // 'all' | pos_product_group_id
  from?: string       // override fecha inicio (empty = auto-detect latest month)
  to?: string         // override fecha fin (empty = auto-detect latest month)
}

export type DrillDownType = 'product' | 'staff' | 'category' | 'hour' | 'zone'

export interface DrillDownState {
  type: DrillDownType
  id: string
  label: string
}

export interface DrillDownData {
  type: string
  summary: Record<string, unknown>
  // Product / Staff / Category / Zone
  byZone?: Array<{ zone: string; qty?: number; revenue: number; cheques: number; propina?: number; avgServiceTime?: number }>
  byHour?: Array<{ hour: number; qty?: number; revenue: number; cheques?: number; propina?: number; avgServiceTime?: number }>
  byDay?: Array<{ date: string; qty: number; revenue: number }>
  // Product
  companions?: Array<{ name: string; qty: number; revenue: number }>
  // Staff / Zone
  topProducts?: Array<{ product: string; qty: number; revenue: number }> | Array<{ productId: string; name: string; qty: number; revenue: number; cheques: number }>
  // Staff / Category / Zone
  dailyTrend?: Array<{ date: string; cheques: number; revenue: number; propina: number }>
  // Hour / Zone
  topStaff?: Array<{ name: string; cheques: number; revenue: number }>
  // New enriched fields
  paymentMethods?: Array<{ method: string; amount: number; count: number; pct: number }>
  categoryBreakdown?: Array<{ categoryId: string; categoryName: string; qty: number; revenue: number }>
  crossCategoryCompanions?: Array<{ categoryId: string; categoryName: string; sharedCheques: number }>
  tipByZone?: Array<{ zone: string; tipTotal: number; tipAvg: number }>
  tipByHour?: Array<{ hour: number; tipTotal: number; tipAvg: number }>
}

export interface POSDashboardData {
  kpis: {
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    propinaPromedio: number
    personas: number
    partySizePromedio: number
    cardPaidTotal: number
    cashPaidTotal: number
    avgServiceTime: number
  }
  itemsRevenueTotal: number
  byZone: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
    avgServiceTime: number
  }>
  unknownZone: {
    revenue: number
    cheques: number
    pct: number
  }
  hourlyRevenue: Array<{
    hour: string
    revenue: number
    cheques: number
    tipTotal: number
    cardPaidTotal: number
    cashPaidTotal: number
  }>
  dailyTrend: Array<{
    date: string
    revenue: number
    cheques: number
    propina: number
    personas: number
  }>
  topProducts: Array<{
    productId: string
    productName: string
    category: string
    quantity: number
    revenue: number
  }>
  topCategories: Array<{
    categoryId: string
    categoryName: string
    quantity: number
    revenue: number
    cheques: number
    tipTotal: number
    tipAvg: number
    avgServiceTime: number
    partySizeAvg: number
  }>
  topProductByCategory: Array<{
    categoryId: string
    categoryName: string
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>
  productsByCategory: Record<string, Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
    cheques: number
  }>>
  staffPerformance: Array<{
    staffId: string
    staffName: string
    staffType: number
    cheques: number
    revenue: number
    propinaTotal: number
    ticketPromedio: number
  }>
  paymentMethods: Array<{
    method: string
    amount: number
    count: number
    pct: number
  }>
  clientTiers: Array<{
    tier: string
    count: number
    totalSpent: number
  }>
  clientSplit: {
    consumidorFinal: { cheques: number; revenue: number }
    identificados: { cheques: number; revenue: number }
  }
  topPerformersByCategory: Record<string, Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
    cheques: number
  }>>
  bottomPerformersByCategory: Record<string, Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
    cheques: number
  }>>
  categoryList: Array<{ id: string; name: string }>
  shifts: Array<{
    shiftId: string
    station: string
    cashier: string
    cashTotal: number
    cardTotal: number
    creditTotal: number
    openedAt: string
    closedAt: string | null
    isClosed: boolean
  }>
  categoryCompanions: Array<{
    cat1Id: string
    cat1Name: string
    cat2Id: string
    cat2Name: string
    sharedCheques: number
  }>
  byZonePayment: Array<{
    zone: string
    methods: Array<{ method: string; amount: number; count: number; pct: number }>
  }>
  filters: { zone: string; category: string; from: string; to: string }
  availableMonths: string[]
  dayCount?: number
  dayOfWeek?: number
}

export function usePOSDashboard(filters: POSDashboardFilters) {
  const [data, setData] = useState<POSDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drill-down state
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null)
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null)
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [drillDownError, setDrillDownError] = useState<string | null>(null)

  // Ref to cancel stale fetches (fixes React StrictMode double-render race condition)
  const abortRef = useRef<AbortController | null>(null)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('zone', filters.zone || 'all')
    p.set('category', filters.category || 'all')
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    return p.toString()
  }, [filters.zone, filters.category, filters.from, filters.to])

  useEffect(() => {
    // Cancel any in-flight request from previous render (StrictMode fix)
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    let cancelled = false

    async function fetchDashboard() {
      setLoading(true)
      setError(null)
      // DON'T setData(null) — it hides ALL components during re-fetch, causing the "empty" flash.
      // Instead, show a loading overlay over existing data.
      try {
        const url = `/api/admin/pos-dashboard?${params}`
        const res = await fetch(url, { signal, next: { revalidate: 300 } })
        if (signal.aborted) return
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (signal.aborted) return
          console.error('[POSDashboard] API error:', res.status, d)
          if (!cancelled) setError(d.error || 'Error cargando datos')
          return
        }
        const d = await res.json()
        if (signal.aborted) return
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return // Stale request cancelled
        console.error('[POSDashboard] Fetch error:', err)
        if (!cancelled) setError('Error de conexion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboard()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [params])

  const refetch = useCallback(() => {
    // Trigger a re-fetch by incrementing a no-op state in the parent,
    // or just call the API directly. Since params is the dependency,
    // we can't force a re-fetch without changing params.
    // Instead, we do a manual fetch here:
    async function manualFetch() {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/admin/pos-dashboard?${params}`
        const res = await fetch(url, { next: { revalidate: 300 } })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.error || 'Error cargando datos')
          return
        }
        const d = await res.json()
        setData(d)
        setError(null)
      } catch {
        setError('Error de conexion')
      } finally {
        setLoading(false)
      }
    }
    manualFetch()
  }, [params])

  const fetchDrillDown = useCallback(async (type: DrillDownType, id: string, label: string, dayOfWeek?: number) => {
    const from = filters.from || ''
    const to = filters.to || ''
    setDrillDown({ type, id, label })
    setDrillDownLoading(true)
    setDrillDownError(null)
    setDrillDownData(null)
    try {
      const p = new URLSearchParams()
      p.set('type', type)
      p.set('id', id)
      p.set('from', from)
      p.set('to', to)
      p.set('zone', filters.zone || 'all')
      p.set('category', filters.category || 'all')
      if (dayOfWeek !== undefined) {
        p.set('dayOfWeek', String(dayOfWeek))
      }
      const res = await fetch(`/api/admin/pos-dashboard/detail?${p.toString()}`, { next: { revalidate: 300 } })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setDrillDownError(d.error || 'Error cargando detalle')
        return
      }
      const d = await res.json()
      setDrillDownData(d)
    } catch {
      setDrillDownError('Error de conexion')
    } finally {
      setDrillDownLoading(false)
    }
  }, [filters.from, filters.to, filters.zone, filters.category])

  const closeDrillDown = useCallback(() => {
    setDrillDown(null)
    setDrillDownData(null)
    setDrillDownError(null)
  }, [])

  return { data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown }
}