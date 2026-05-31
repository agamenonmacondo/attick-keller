import { useState, useEffect, useRef, useCallback } from 'react'

export interface IngredientDetail {
  ingredientId: string
  ingredientName: string
  categoryName: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

export interface ProductCostItem {
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  salePrice: number
  priceBeforeTax: number
  recipeCost: number
  margin: number
  marginPct: number | null
  ingredientCount: number
  hasRecipe: boolean
  ingredients: IngredientDetail[]
}

export interface ProductCostCatalogData {
  products: ProductCostItem[]
  categories: Array<{ id: string; name: string }>
  summary: {
    totalProducts: number
    productsWithRecipe: number
    avgMarginPct: number
    productCount: number
  }
}

export function useProductCostCatalog() {
  const [data, setData] = useState<ProductCostCatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/product-costs', {
        signal: controller.signal,
        next: { revalidate: 300 },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Error ${res.status}`)
      }

      const json = await res.json()
      if (!controller.signal.aborted) {
        setData(json)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}