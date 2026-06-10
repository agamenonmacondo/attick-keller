'use client'

import { useState, useMemo } from 'react'
import { MagnifyingGlass, CaretDown, CaretRight, Receipt } from '@phosphor-icons/react'
import { formatCOPFull } from '@/lib/utils/formatCurrency'
import type { ProductCostItem, ProductCostCatalogData } from '@/lib/hooks/useProductCostCatalog'

interface ProductCostTableProps {
  data: ProductCostCatalogData | null
  loading: boolean
  error: string | null
  onProductClick: (product: ProductCostItem) => void
  refetch: () => void
}

type SortKey = 'marginPct' | 'margin' | 'salePrice' | 'recipeCost' | 'count'
type SortDir = 'asc' | 'desc'

export default function ProductCostTable({ data, loading, error, onProductClick, refetch }: ProductCostTableProps) {
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categorySort, setCategorySort] = useState<SortKey>('marginPct')
  const [categorySortDir, setCategorySortDir] = useState<SortDir>('asc')

  // Group products by category
  const grouped = useMemo(() => {
    if (!data) return { categories: [] as { id: string; name: string; products: ProductCostItem[]; avgMarginPct: number; totalProducts: number; withRecipe: number }[], ungrouped: [] as ProductCostItem[] }

    let items = data.products

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((p) => p.productName.toLowerCase().includes(q))
    }

    // Group by category
    const groups = new Map<string, ProductCostItem[]>()
    for (const p of items) {
      const key = p.categoryId || '_uncategorized'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    const categories = data.categories
      .map((cat) => {
        const products = groups.get(cat.id) || []
        if (products.length === 0) return null
        const withRecipe = products.filter((p) => p.hasRecipe)
        const avgMarginPct = withRecipe.length > 0
          ? withRecipe.reduce((sum, p) => sum + (p.marginPct ?? 0), 0) / withRecipe.length
          : -1
        return {
          id: cat.id,
          name: cat.name,
          products,
          avgMarginPct,
          totalProducts: products.length,
          withRecipe: withRecipe.length,
        }
      })
      .filter(Boolean) as { id: string; name: string; products: ProductCostItem[]; avgMarginPct: number; totalProducts: number; withRecipe: number }[]

    // Sort categories
    categories.sort((a, b) => {
      let cmp = 0
      switch (categorySort) {
        case 'marginPct': cmp = a.avgMarginPct - b.avgMarginPct; break
        case 'count': cmp = a.totalProducts - b.totalProducts; break
        case 'salePrice': {
          const aAvg = a.products.reduce((s, p) => s + p.salePrice, 0) / a.products.length
          const bAvg = b.products.reduce((s, p) => s + p.salePrice, 0) / b.products.length
          cmp = aAvg - bAvg
          break
        }
        default: cmp = a.name.localeCompare(b.name)
      }
      return categorySortDir === 'asc' ? cmp : -cmp
    })

    return { categories, ungrouped: (groups.get('_uncategorized') || []) as ProductCostItem[] }
  }, [data, search, categorySort, categorySortDir])

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategories(new Set(grouped.categories.map((c) => c.id)))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  const marginColor = (pct: number | null) => {
    if (pct === null) return 'text-[var(--text-secondary)]'
    if (pct < 30) return 'text-[var(--color-danger)]'
    if (pct < 50) return 'text-yellow-400'
    return 'text-[var(--color-success)]'
  }

  const avgMarginBadge = (pct: number) => {
    if (pct < 0) return null
    if (pct < 30) return 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
    if (pct < 50) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-green-500/20 text-[var(--color-success)]'
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-[var(--color-danger)]">Error: {error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded bg-[var(--color-ak-borgona)] text-white text-sm hover:opacity-90">
          Reintentar
        </button>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Receipt size={32} className="animate-spin text-[var(--color-ak-borgona)]" />
        <span className="ml-3 text-[var(--text-secondary)]">Cargando catalogo...</span>
      </div>
    )
  }

  if (!data) return null

  const totalWithRecipe = grouped.categories.reduce((s, c) => s + c.withRecipe, 0)
  const totalExpanded = expandedCategories.size

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Catalogo de Costos por Producto
          </h2>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {grouped.categories.length} categorias · {data.summary.productCount} productos ({totalWithRecipe} con receta)
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-[10px] px-3 py-1 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]">
            Expandir todo
          </button>
          <button onClick={collapseAll} className="text-[10px] px-3 py-1 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]">
            Colapsar todo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-ak-borgona)]"
        />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total Productos</p>
          <p className="text-lg font-bold tabular-nums">{data.summary.productCount}</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Con Receta</p>
          <p className="text-lg font-bold tabular-nums text-[var(--color-success)]">{data.summary.productsWithRecipe}</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Sin Receta</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-secondary)]">
            {data.summary.productCount - data.summary.productsWithRecipe}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Margen Prom.</p>
          <p className="text-lg font-bold tabular-nums">{data.summary.avgMarginPct}%</p>
        </div>
      </div>

      {/* Category accordion */}
      <div className="space-y-1">
        {grouped.categories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.id)
          const avgMargin = cat.avgMarginPct >= 0 ? `${cat.avgMarginPct.toFixed(1)}%` : '—'
          const badge = avgMarginBadge(cat.avgMarginPct)

          return (
            <div key={cat.id} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] hover:bg-[var(--bg-input)] transition-colors text-left"
              >
                {isExpanded ? <CaretDown size={14} className="text-[var(--text-secondary)]" /> : <CaretRight size={14} className="text-[var(--text-secondary)]" />}
                <span className="text-xs font-bold uppercase tracking-wider flex-1">{cat.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{cat.totalProducts} productos</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{cat.withRecipe} con receta</span>
                {badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge}`}>
                    Margen prom. {avgMargin}
                  </span>
                )}
              </button>

              {/* Expanded products */}
              {isExpanded && (
                <div className="border-t border-[var(--border-default)]">
                  <table className="w-full text-[10px] sm:text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-[var(--bg-input)] text-[var(--text-secondary)] uppercase tracking-wider text-[9px]">
                        <th className="py-1.5 px-2 text-left">Producto</th>
                        <th className="py-1.5 px-2 text-right">Precio</th>
                        <th className="py-1.5 px-2 text-right">Costo Receta</th>
                        <th className="py-1.5 px-2 text-right">Margen $</th>
                        <th className="py-1.5 px-2 text-right min-w-[55px]">Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.products.map((p) => (
                        <tr
                          key={p.productId}
                          onClick={() => p.hasRecipe && onProductClick(p)}
                          className={`border-t border-[var(--border-default)] ${
                            p.hasRecipe
                              ? 'cursor-pointer hover:bg-[var(--bg-input)]'
                              : 'opacity-50 cursor-default'
                          }`}
                        >
                          <td className="py-1.5 px-2 max-w-[200px] truncate font-medium">
                            {p.productName}
                            {!p.hasRecipe && (
                              <span className="ml-1 text-[8px] bg-[var(--bg-input)] text-[var(--text-secondary)] px-1 py-0.5 rounded">
                                sin receta
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{formatCOPFull(p.salePrice)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {p.hasRecipe ? formatCOPFull(p.recipeCost) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {p.hasRecipe ? formatCOPFull(p.margin) : '—'}
                          </td>
                          <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${marginColor(p.marginPct)}`}>
                            {p.marginPct !== null ? `${p.marginPct.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}

        {grouped.categories.length === 0 && (
          <div className="py-8 text-center text-[var(--text-secondary)]">
            {search ? `No se encontraron productos para "${search}"` : 'No hay productos'}
          </div>
        )}
      </div>
    </div>
  )
}