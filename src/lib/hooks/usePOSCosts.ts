'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

export interface POSCostsFilters {
  from?: string
  to?: string
}

export interface POSCostsData {
  summary: {
    totalPurchases: number
    avgMonthlyPurchases: number
    purchaseCount: number
    cancelledCount: number
    avgMarginPct: number
    productsWithRecipe: number
    productsTotal: number
    topSupplier: string
  }
  dailyPurchases: Array<{
    date: string
    total: number
    count: number
  }>
  monthlyPurchases: Array<{
    month: string
    total: number
    count: number
  }>
  costByCategory: Array<{
    categoryId: string
    categoryName: string
    total: number
    count: number
    pct: number
  }>
  purchasesBySupplier: Array<{
    supplierId: string
    supplierName: string
    total: number
    count: number
    pct: number
  }>
  productMargins: Array<{
    productId: string
    productName: string
    categoryId: string
    categoryName: string
    salePrice: number
    recipeCost: number
    margin: number
    marginPct: number
  }>
  categoryList: Array<{ id: string; name: string }>
  availableMonths: string[]
  filters: { from: string; to: string }
}

export function usePOSCosts(filters: POSCostsFilters) {
  const [data, setData] = useState<POSCostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    return p.toString()
  }, [filters.from, filters.to])

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    let cancelled = false

    async function fetchCosts() {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/admin/pos-costs?${params}&_t=${Date.now()}`
        const res = await fetch(url, { signal, cache: 'no-store' })
        if (signal.aborted) return
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (signal.aborted) return
          if (!cancelled) setError(d.error || 'Error cargando datos de costos')
          return
        }
        const d = await res.json()
        if (signal.aborted) return
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        if (!cancelled) setError('Error de conexion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCosts()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [params])

  const refetch = useCallback(() => {
    async function manualFetch() {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/admin/pos-costs?${params}&_t=${Date.now()}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.error || 'Error cargando datos de costos')
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

  return { data, loading, error, refetch }
}