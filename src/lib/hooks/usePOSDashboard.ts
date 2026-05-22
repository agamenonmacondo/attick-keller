'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface POSDashboardFilters {
  zone: string        // 'all' | 'Tipi' | 'Attic' | 'Chispas'
  category: string    // 'all' | pos_product_group_id
  from?: string       // override fecha inicio (default: 2026-04-01)
  to?: string         // override fecha fin (default: 2026-04-30)
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
  }
  byZone: Array<{
    zone: string
    revenue: number
    cheques: number
    ticketPromedio: number
    propinaTotal: number
    pct: number
  }>
  hourlyRevenue: Array<{
    hour: string
    revenue: number
    cheques: number
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
  }>
  topProductByCategory: Array<{
    categoryId: string
    categoryName: string
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>
  staffPerformance: Array<{
    staffId: string
    staffName: string
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
  filters: { zone: string; category: string; from: string; to: string }
}

export function usePOSDashboard(filters: POSDashboardFilters) {
  const [data, setData] = useState<POSDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return { data, loading, error, refetch: fetchData }
}