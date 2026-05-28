'use client'

import { useState, useMemo } from 'react'
import { MagnifyingGlass, Funnel, ArrowUp, ArrowDown, Receipt } from '@phosphor-icons/react'
import { formatCOPFull } from '@/lib/utils/formatCurrency'
import type { ProductCostItem, ProductCostCatalogData } from '@/lib/hooks/useProductCostCatalog'

interface ProductCostTableProps {
  data: ProductCostCatalogData | null
  loading: boolean
  error: string | null
  onProductClick: (product: ProductCostItem) => void
  refetch: () => void
}

type SortKey = 'name' | 'marginPct' | 'margin' | 'salePrice' | 'recipeCost'
type SortDir = 'asc' | 'desc'
const PAGE_SIZE = 50

export default function ProductCostTable({ data, loading, error, onProductClick, refetch }: ProductCostTableProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('marginPct')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!data) return []
    let items = data.products

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((p) => p.productName.toLowerCase().includes(q))
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter((p) => p.categoryId === selectedCategory)
    }

    // Sort
    const sorted = [...items].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = a.productName.localeCompare(b.productName); break
        case 'marginPct': cmp = (a.marginPct ?? 999) - (b.marginPct ?? 999); break
        case 'margin': cmp = a.margin - b.margin; break
        case 'salePrice': cmp = a.salePrice - b.salePrice; break
        case 'recipeCost': cmp = a.recipeCost - b.recipeCost; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [data, search, selectedCategory, sortBy, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <span className="ml-1 opacity-30">↕</span>
    return sortDir === 'asc' ? <ArrowUp size={10} className="ml-1 inline" /> : <ArrowDown size={10} className="ml-1 inline" />
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

  const withRecipe = filtered.filter((p) => p.hasRecipe).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Catalogo de Costos por Producto
        </h2>
        <span className="text-[10px] text-[var(--text-secondary)]">
          {filtered.length} de {data.summary.productCount} productos ({withRecipe} con receta)
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-ak-borgona)]"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Funnel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(0) }}
            className="pl-9 pr-8 py-2 text-xs rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] appearance-none cursor-pointer"
          >
            <option value="all">Todas las categorias</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split('-') as [SortKey, SortDir]
            setSortBy(key)
            setSortDir(dir)
            setPage(0)
          }}
          className="px-3 py-2 text-xs rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] appearance-none cursor-pointer"
        >
          <option value="marginPct-asc">Margen % (menor a mayor)</option>
          <option value="marginPct-desc">Margen % (mayor a menor)</option>
          <option value="margin-asc">Margen $ (menor a mayor)</option>
          <option value="salePrice-desc">Precio (mayor a menor)</option>
          <option value="salePrice-asc">Precio (menor a mayor)</option>
          <option value="recipeCost-desc">Costo receta (mayor a menor)</option>
          <option value="name-asc">Nombre A-Z</option>
          <option value="name-desc">Nombre Z-A</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
        <table className="w-full text-[10px] sm:text-xs min-w-[700px]">
          <thead>
            <tr className="bg-[var(--bg-input)] text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
              <th className="py-2 px-2 text-left">#</th>
              <th className="py-2 px-2 text-left cursor-pointer" onClick={() => handleSort('name')}>
                Producto <SortIcon col="name" />
              </th>
              <th className="py-2 px-2 text-left">Categoria</th>
              <th className="py-2 px-2 text-right cursor-pointer" onClick={() => handleSort('salePrice')}>
                Precio <SortIcon col="salePrice" />
              </th>
              <th className="py-2 px-2 text-right cursor-pointer" onClick={() => handleSort('recipeCost')}>
                Costo Receta <SortIcon col="recipeCost" />
              </th>
              <th className="py-2 px-2 text-right cursor-pointer" onClick={() => handleSort('margin')}>
                Margen $ <SortIcon col="margin" />
              </th>
              <th className="py-2 px-2 text-right cursor-pointer min-w-[60px]" onClick={() => handleSort('marginPct')}>
                Margen % <SortIcon col="marginPct" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p, i) => (
              <tr
                key={p.productId}
                onClick={() => p.hasRecipe && onProductClick(p)}
                className={`border-t border-[var(--border-default)] ${
                  p.hasRecipe
                    ? 'cursor-pointer hover:bg-[var(--bg-input)]'
                    : 'opacity-60 cursor-default'
                }`}
              >
                <td className="py-1.5 px-2 text-[var(--text-secondary)]">{page * PAGE_SIZE + i + 1}</td>
                <td className="py-1.5 px-2 font-medium max-w-[200px] truncate">
                  {p.productName}
                  {!p.hasRecipe && (
                    <span className="ml-2 text-[var(--text-secondary)] text-[9px] bg-[var(--bg-input)] px-1 py-0.5 rounded">
                      Sin receta
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-[var(--text-secondary)]">{p.categoryName}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{formatCOPFull(p.salePrice)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {p.hasRecipe ? formatCOPFull(p.recipeCost) : '—'}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {p.hasRecipe ? formatCOPFull(p.margin) : '—'}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${
                  p.marginPct === null
                    ? 'text-[var(--text-secondary)]'
                    : p.marginPct < 30
                      ? 'text-red-400'
                      : p.marginPct < 50
                        ? 'text-yellow-400'
                        : 'text-green-400'
                }`}>
                  {p.marginPct !== null ? `${p.marginPct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">
                  {search ? `No se encontraron productos para "${search}"` : 'Sin productos'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded bg-[var(--bg-input)] disabled:opacity-40 hover:bg-[var(--border-default)]"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded bg-[var(--bg-input)] disabled:opacity-40 hover:bg-[var(--border-default)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Total Productos</p>
          <p className="text-lg font-bold tabular-nums">{data.summary.productCount}</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Con Receta</p>
          <p className="text-lg font-bold tabular-nums text-green-400">{data.summary.productsWithRecipe}</p>
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
    </div>
  )
}