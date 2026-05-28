'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

export interface POSCostsFilters {
  from?: string
  to?: string
  group?: string
}

export interface POSCostsData {
  summary: {
    totalCOGS: number
    totalPurchases: number
    grossMargin: number
    grossMarginPct: number
    purchaseCount: number
  }
  dailyCOGS: Array<{ date: string; total: number; count: number }>
  monthlyCOGS: Array<{ month: string; total: number; count: number }>
  costByCategory: Array<{
    categoryId: string
    categoryName: string
    totalCost: number
    ingredientCount: number
  }>
  topLowMarginProducts: Array<{
    productId: string
    productName: string
    groupName: string
    salePrice: number
    recipeCost: number
    margin: number
    marginPct: number
  }>
  topHighMarginProducts: Array<{
    productId: string
    productName: string
    groupName: string
    salePrice: number
    recipeCost: number
    margin: number
    marginPct: number
  }>
  purchasesBySupplier: Array<{
    supplierId: string
    supplierName: string
    total: number
    count: number
  }>
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
    if (filters.group && filters.group !== 'all') p.set('group', filters.group)
    return p.toString()
  }, [filters.from, filters.to, filters.group])

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

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
          console.error('[POSCosts] API error:', res.status, d)
          if (!cancelled) setError(d.error || 'Error cargando costos')
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
        console.error('[POSCosts] Fetch error:', err)
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
          setError(d.error || 'Error cargando costos')
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