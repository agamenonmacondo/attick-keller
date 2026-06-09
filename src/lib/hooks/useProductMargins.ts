'use client'

import { useState, useEffect, useCallback } from 'react'

interface ProductoMargen {
  product_name: string
  pos_product_id: string
  category_name: string
  macro_category: string
  revenue: number
  cost_total: number
  margin_pct: number
  margin_bruto: number
  quantity_sold: number
}

interface CategoriaResumen {
  categoria: string
  revenue: number
  margin_pct: number
  importan: number
  drenan: number
  count: number
}

interface MarginsData {
  kpis: {
    total_revenue: number
    margin_bruto: number
    margin_pct: number
    total_productos: number
  }
  resumen_ejecutivo: {
    categorias: CategoriaResumen[]
  }
  importan: ProductoMargen[]
  drenan: ProductoMargen[]
  todos: ProductoMargen[]
}

export function useProductMargins(from: string, to: string, category: string = '') {
  const [data, setData] = useState<MarginsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMargins = useCallback(async () => {
    if (!from || !to) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ from, to })
      if (category) params.set('category', category)

      const res = await fetch(`/api/admin/informes-rayo/margins?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Error ${res.status}`)
      }

      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Error cargando márgenes')
      console.error('[useProductMargins]', err)
    } finally {
      setLoading(false)
    }
  }, [from, to, category])

  useEffect(() => {
    fetchMargins()
  }, [fetchMargins])

  return { data, loading, error, refetch: fetchMargins }
}
