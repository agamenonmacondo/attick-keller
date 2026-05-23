'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface POSDashboardFilters {
  zone: string        // 'all' | 'Tipi' | 'Attic' | 'Chispas'
  category: string    // 'all' | pos_product_group_id
  from?: string       // override fecha inicio (default: 2026-04-01)
  to?: string         // override fecha fin (default: 2026-04-30)
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
  byZone: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
    avgServiceTime: number
  }>
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

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('zone', filters.zone || 'all')
    p.set('category', filters.category || 'all')
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    return p.toString()
  }, [filters.zone, filters.category, filters.from, filters.to])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pos-dashboard?${params}`)
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
  }, [params])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchDrillDown = useCallback(async (type: DrillDownType, id: string, label: string) => {
    const from = filters.from || '2026-04-01'
    const to = filters.to || '2026-04-30'
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
      const res = await fetch(`/api/admin/pos-dashboard/detail?${p.toString()}`)
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
  }, [filters.from, filters.to])

  const closeDrillDown = useCallback(() => {
    setDrillDown(null)
    setDrillDownData(null)
    setDrillDownError(null)
  }, [])

  return { data, loading, error, refetch: fetchData, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown }
}