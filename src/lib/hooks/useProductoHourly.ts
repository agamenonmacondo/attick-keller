'use client'

import { useState, useCallback } from 'react'

export interface ProductoHoraItem {
  product_name: string
  product_id: string
  category_name: string
  date: string
  hour: number
  quantity: number
  revenue: number
}

export interface ProductoHourlyData {
  productos: ProductoHoraItem[]
  period: { from: string; to: string }
}

export function useProductoHourly() {
  const [data, setData] = useState<ProductoHoraItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (from: string, to: string, zone: string = 'all') => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from, to, zone })
      const res = await fetch(`/api/admin/informes-rayo/productos-hora?${params}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error cargando datos' }))
        throw new Error(err.error || 'Error cargando datos')
      }
      const json = await res.json()
      setData(json.productos || [])
    } catch (e: any) {
      setError(e.message || 'Error desconocido')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchData }
}

/**
 * Transform flat product-hour rows into a matrix:
 * Rows = products, Columns = hours (0-23)
 */
export function buildHourlyMatrix(data: ProductoHoraItem[]): {
  products: string[]
  hours: string[]
  matrix: Map<string, Map<string, { qty: number; revenue: number }>>
} {
  const productSet = new Set<string>()
  const matrix = new Map<string, Map<string, { qty: number; revenue: number }>>()

  for (const row of data) {
    productSet.add(row.product_name)
    if (!matrix.has(row.product_name)) {
      matrix.set(row.product_name, new Map())
    }
    const productRow = matrix.get(row.product_name)!
    const hour = String(row.hour)  // String key — MUST match column lookups
    const existing = productRow.get(hour)
    if (existing) {
      existing.qty += Number(row.quantity) || 0
      existing.revenue += Number(row.revenue) || 0
    } else {
      productRow.set(hour, {
        qty: Number(row.quantity) || 0,
        revenue: Number(row.revenue) || 0,
      })
    }
  }

  const products = [...productSet].sort()
  const hours = Array.from({ length: 24 }, (_, i) => String(i))  // String keys

  return { products, hours, matrix }
}

/**
 * Aggregate flat data by day (instead of hour)
 */
export function buildDailyMatrix(data: ProductoHoraItem[]): {
  products: string[]
  days: string[]
  matrix: Map<string, Map<string, { qty: number; revenue: number }>>
} {
  const daysSet = new Set<string>()
  const productSet = new Set<string>()
  const matrix = new Map<string, Map<string, { qty: number; revenue: number }>>()

  for (const row of data) {
    const day = row.date
    productSet.add(row.product_name)
    daysSet.add(day)

    if (!matrix.has(row.product_name)) {
      matrix.set(row.product_name, new Map())
    }
    const productRow = matrix.get(row.product_name)!
    const existing = productRow.get(day)
    if (existing) {
      existing.qty += Number(row.quantity) || 0
      existing.revenue += Number(row.revenue) || 0
    } else {
      productRow.set(day, {
        qty: Number(row.quantity) || 0,
        revenue: Number(row.revenue) || 0,
      })
    }
  }

  const products = [...productSet].sort()
  const days = [...daysSet].sort()

  return { products, days, matrix }
}
