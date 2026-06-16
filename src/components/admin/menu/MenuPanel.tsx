'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Spinner, CaretDown, CaretRight, CaretLeft, PencilSimple, Eye, EyeSlash, Trash,
  MagnifyingGlass, Package, Link, X, Flask, CheckCircle, ArrowsLeftRight, Tag,
} from '@phosphor-icons/react'
import { formatCOP } from '@/lib/utils/formatCOP'
import { AnimatedCard } from '../shared/AnimatedCard'
import { MenuItemForm } from './MenuItemForm'
import { CategoryForm } from './CategoryForm'

const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

// --- Types ---

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  image_url: string | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
  pos_product_id: string | null
  pos_group_id: string | null
}

interface POSProduct {
  pos_product_id: string
  name: string
  pos_group_id: string
  use_dining: boolean
  use_delivery: boolean
  visible_menu: boolean
  price?: number
  linked_menu_item_id?: string | null
}

interface POSGroup {
  pos_group_id: string
  name: string
}

interface MenuMapping {
  id: string
  menu_item_id: string
  pos_product_id: string
  confidence: 'exact' | 'fuzzy' | 'manual'
  verified: boolean
}

interface RecipeIngredient {
  pos_ingredient_id: string
  name: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

interface RecipeData {
  menuItem: MenuItem
  posProduct: { pos_product_id: string; name: string } | null
  recipe: {
    ingredients: RecipeIngredient[]
    totalCost: number
    sellPrice: number
    margin: number
    marginPercent: number
  }
}

type TabId = 'site-menu' | 'pos-catalog' | 'linking'

// --- Component ---

export function MenuPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('site-menu')

  // --- Menu del Sitio state ---
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // --- Catalogo POS state ---
  const [posProducts, setPosProducts] = useState<POSProduct[]>([])
  const [posGroups, setPosGroups] = useState<POSGroup[]>([])
  const [posSearch, setPosSearch] = useState('')
  const [posGroupFilter, setPosGroupFilter] = useState<string>('')
  const [selectedPosGroup, setSelectedPosGroup] = useState<string | null>(null)
  const [posLoading, setPosLoading] = useState(false)
  const [addModalProduct, setAddModalProduct] = useState<POSProduct | null>(null)
  const [addModalCategory, setAddModalCategory] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // --- Vinculacion state ---
  const [mappings, setMappings] = useState<MenuMapping[]>([])
  const [linkingLoading, setLinkingLoading] = useState(false)
  const [linkSearchOpen, setLinkSearchOpen] = useState<string | null>(null) // menu_item_id
  const [linkSearchQuery, setLinkSearchQuery] = useState('')
  const [linkSearchResults, setLinkSearchResults] = useState<POSProduct[]>([])
  const [linkSearchLoading, setLinkSearchLoading] = useState(false)

  // --- Recipe panel state ---
  const [recipeItem, setRecipeItem] = useState<string | null>(null) // menu item id
  const [recipeData, setRecipeData] = useState<RecipeData | null>(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [posRecipeProduct, setPosRecipeProduct] = useState<string | null>(null) // pos_product_id
  const [posRecipeData, setPosRecipeData] = useState<{
    posProduct: { pos_product_id: string; name: string; pos_group_id: string; groupName: string }
    linkedMenuItem: { id: string; name: string; confidence: string; verified: boolean } | null
    price: number
    priceBeforeTax: number
    recipe: {
      ingredients: { pos_ingredient_id: string; name: string; quantity: number; unit: string; unitCost: number; totalCost: number; is_composite: boolean }[]
      totalCost: number
      sellPrice: number
      margin: number
      marginPercent: number
    }
  } | null>(null)
  const [posRecipeLoading, setPosRecipeLoading] = useState(false)

  // --- Fetch menu data ---
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/menu')
      if (res.ok) {
        const d = await res.json()
        setCategories(d.categories || [])
        setItems(d.items || [])
        setExpandedCategories(new Set((d.categories || []).map((c: Category) => c.id)))
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  // --- Fetch POS products when tab is active ---
  const fetchPOSProducts = useCallback(async () => {
    setPosLoading(true)
    try {
      const params = new URLSearchParams({
        q: posSearch,
        group_id: posGroupFilter,
        linked: 'true',
        unlinked: 'true',
        limit: '200',
        offset: '0',
      })
      const res = await fetch(`/api/admin/pos-products?${params}`)
      if (res.ok) {
        const d = await res.json()
        setPosProducts(d.products || [])
        setPosGroups(d.groups || [])
      }
    } catch {
      // Silently fail
    } finally {
      setPosLoading(false)
    }
  }, [posSearch, posGroupFilter])

  useEffect(() => {
    if (activeTab === 'pos-catalog') fetchPOSProducts()
  }, [activeTab, fetchPOSProducts])

  // --- Fetch linking data ---
  const fetchMappings = useCallback(async () => {
    setLinkingLoading(true)
    try {
      const res = await fetch('/api/admin/pos-products?linked=true&limit=200&offset=0')
      if (res.ok) {
        const d = await res.json()
        setMappings(d.mappings || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLinkingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'linking') fetchMappings()
  }, [activeTab, fetchMappings])

  // --- Fetch recipe ---
  const fetchRecipe = useCallback(async (itemId: string) => {
    setRecipeLoading(true)
    setRecipeItem(itemId)
    setRecipeData(null)
    try {
      const res = await fetch(`/api/admin/menu/${itemId}/recipe`)
      if (res.ok) {
        const d = await res.json()
        setRecipeData(d)
      }
    } catch {
      // Silently fail
    } finally {
      setRecipeLoading(false)
    }
  }, [])

  // --- Fetch POS product recipe ---
  const fetchPosRecipe = useCallback(async (posProductId: string) => {
    setPosRecipeLoading(true)
    setPosRecipeProduct(posProductId)
    setPosRecipeData(null)
    try {
      const res = await fetch(`/api/admin/pos-products/${encodeURIComponent(posProductId)}`)
      if (res.ok) {
        const d = await res.json()
        setPosRecipeData(d)
      }
    } catch {
      // Silently fail
    } finally {
      setPosRecipeLoading(false)
    }
  }, [])

  // --- Menu del Sitio handlers ---
  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAvailability = useCallback(async (item: MenuItem) => {
    const newAvailable = !item.is_available
    try {
      const res = await fetch(`/api/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newAvailable }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newAvailable } : i))
      }
    } catch {
      // Silently fail
    }
  }, [])

  const toggleCategoryActive = useCallback(async (cat: Category) => {
    const newActive = !cat.is_active
    try {
      const res = await fetch(`/api/admin/menu/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: newActive } : c))
      }
    } catch {
      // Silently fail
    }
  }, [])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!confirm('Ocultar este plato del menu?')) return
    try {
      const res = await fetch(`/api/admin/menu/items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== itemId))
      }
    } catch {
      // Silently fail
    }
  }, [])

  // --- POS Add to menu handler ---
  const handleAddToMenu = useCallback(async () => {
    if (!addModalProduct || !addModalCategory) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/pos-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_product_id: addModalProduct.pos_product_id,
          category_id: addModalCategory,
          restaurant_id: RESTAURANT_ID,
        }),
      })
      if (res.ok) {
        setAddModalProduct(null)
        setAddModalCategory('')
        fetchMenu()
        fetchPOSProducts()
      } else {
        const d = await res.json()
        setAddError(d.error || 'Error al agregar')
      }
    } catch {
      setAddError('Error de conexion')
    } finally {
      setAdding(false)
    }
  }, [addModalProduct, addModalCategory, fetchMenu, fetchPOSProducts])

  // --- Link search handler ---
  const handleLinkSearch = useCallback(async (query: string, menuItemId: string) => {
    setLinkSearchQuery(query)
    if (query.length < 2) {
      setLinkSearchResults([])
      return
    }
    setLinkSearchLoading(true)
    try {
      const params = new URLSearchParams({ q: query, limit: '20', offset: '0' })
      const res = await fetch(`/api/admin/pos-products?${params}`)
      if (res.ok) {
        const d = await res.json()
        setLinkSearchResults(d.products || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLinkSearchLoading(false)
    }
  }, [])

  const handleLinkProduct = useCallback(async (menuItemId: string, posProductId: string) => {
    try {
      const res = await fetch(`/api/admin/menu/items/${menuItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_product_id: posProductId }),
      })
      if (res.ok) {
        setLinkSearchOpen(null)
        fetchMenu()
        fetchMappings()
      }
    } catch {
      // Silently fail
    }
  }, [fetchMenu, fetchMappings])

  const handleVerifyMapping = useCallback(async (mappingId: string) => {
    try {
      const res = await fetch(`/api/admin/pos-products/mappings/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true }),
      })
      if (res.ok) {
        fetchMappings()
      }
    } catch {
      // Silently fail
    }
  }, [fetchMappings])

  // --- Grouped POS products (only groups with products) ---
  const groupedPOS: Record<string, POSProduct[]> = {}
  posProducts.forEach(p => {
    const gid = p.pos_group_id || '__ungrouped__'
    if (!groupedPOS[gid]) groupedPOS[gid] = []
    groupedPOS[gid].push(p)
  })
  // Sort groups by pos_group_id to match the POS order
  const sortedGroupKeys = Object.keys(groupedPOS).sort()

  // --- Tab configuration ---
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'site-menu', label: 'Menu del Sitio', icon: <Package size={16} /> },
    { id: 'pos-catalog', label: 'Catalogo POS', icon: <Tag size={16} /> },
    { id: 'linking', label: 'Vinculacion', icon: <Link size={16} /> },
  ]

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border-default)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-ak-borgona)] text-[var(--color-ak-borgona)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================== TAB: Menu del Sitio =================== */}
      {activeTab === 'site-menu' && (
        <>
          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setEditingCategory(null); setShowCategoryForm(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] transition-all duration-200"
            >
              <Plus size={16} weight="bold" />
              Nueva Categoria
            </button>
            <button
              type="button"
              onClick={() => { setEditingItem(null); setShowItemForm(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-[var(--color-ak-borgona)] hover:bg-[var(--color-ak-borgona)]/10 active:scale-[0.97] transition-all duration-200"
            >
              <Plus size={16} weight="bold" />
              Nuevo Plato
            </button>
          </div>

          {/* Categories */}
          {categories.map((cat, ci) => {
            const categoryItems = items.filter(i => i.category_id === cat.id)
            const isExpanded = expandedCategories.has(cat.id)

            return (
              <AnimatedCard key={cat.id} delay={ci * 0.06} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
                {/* Category header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--bg-input)]/50 transition-colors duration-200"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <CaretDown size={16} className="text-[var(--text-secondary)]" /> : <CaretRight size={16} className="text-[var(--text-secondary)]" />}
                    <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">({categoryItems.length} platos)</span>
                    {!cat.is_active && (
                      <span className="rounded-full bg-[var(--color-danger)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-danger)]">Inactiva</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleCategoryActive(cat)}
                      className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                      title={cat.is_active ? 'Ocultar categoria' : 'Mostrar categoria'}
                    >
                      {cat.is_active ? <Eye size={14} /> : <EyeSlash size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingCategory(cat); setShowCategoryForm(true) }}
                      className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                      title="Editar categoria"
                    >
                      <PencilSimple size={14} />
                    </button>
                  </div>
                </div>

                {/* Items grid */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[var(--border-default)] px-5 py-4">
                        {categoryItems.length === 0 ? (
                          <p className="py-4 text-center text-sm text-[var(--text-secondary)]">Sin platos en esta categoria</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {categoryItems.map((item, ii) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: ii * 0.04, duration: 0.2 }}
                                className={`rounded-lg border p-3 relative group cursor-pointer ${
                                  item.is_available ? 'border-[var(--border-default)] bg-[var(--bg-card)]' : 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10'
                                }`}
                                onClick={() => fetchRecipe(item.id)}
                              >
                                {/* Featured badge */}
                                {item.is_featured && (
                                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-[var(--color-ak-dorado)] px-1.5 py-0.5 text-[8px] font-bold text-white">*</span>
                                )}

                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{item.name}</h4>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); setEditingItem(item); setShowItemForm(true) }}
                                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
                                      title="Editar"
                                    >
                                      <PencilSimple size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                                      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                                      title="Ocultar"
                                    >
                                      <Trash size={12} />
                                    </button>
                                  </div>
                                </div>

                                {item.description && (
                                  <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mb-2">{item.description}</p>
                                )}

                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-sm font-bold text-[var(--color-ak-borgona)]">{formatCOP(item.price)}</span>
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); toggleAvailability(item) }}
                                    className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                      item.is_available
                                        ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)]'
                                        : 'bg-[var(--color-danger)]/10 text-[#EF5350]'
                                    }`}
                                  >
                                    {item.is_available ? 'Disponible' : 'Oculto'}
                                  </button>
                                </div>

                                {/* POS link indicator */}
                                {item.pos_product_id && (
                                  <div className="mt-1.5 flex items-center gap-1">
                                    <Flask size={10} className="text-[var(--color-ak-dorado)]" />
                                    <span className="text-[9px] text-[var(--color-ak-dorado)]">POS</span>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </AnimatedCard>
            )
          })}

          {categories.length === 0 && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No hay categorias de menu</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Crea una categoria para empezar a agregar platos</p>
            </div>
          )}
        </>
      )}

      {/* =================== TAB: Catalogo POS =================== */}
      {activeTab === 'pos-catalog' && (
        <div className="space-y-5">
          {/* Breadcrumb nav */}
          {selectedPosGroup ? (
            <button
              type="button"
              onClick={() => setSelectedPosGroup(null)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-ak-borgona)] hover:underline"
            >
              <CaretLeft size={16} />
              Todas las categorias
            </button>
          ) : null}

          {/* Search bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={posSearch}
                onChange={e => setPosSearch(e.target.value)}
                placeholder="Buscar productos POS..."
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              />
            </div>
          </div>

          {posLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={28} className="animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : posProducts.length === 0 ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No se encontraron productos POS</p>
            </div>
          ) : selectedPosGroup ? (
            /* ====== Products inside selected category ====== */
            <div className="space-y-3">
              {(() => {
                const group = posGroups.find(g => g.pos_group_id === selectedPosGroup)
                const products = groupedPOS[selectedPosGroup] || []
                const linkedCount = products.filter(p => !!p.linked_menu_item_id).length
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                        {group?.name || 'Sin grupo'}
                      </h3>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {linkedCount} de {products.length} en menu
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {products
                        .filter(p => !posSearch || p.name.toLowerCase().includes(posSearch.toLowerCase()))
                        .map(product => {
                        const isLinked = !!product.linked_menu_item_id
                        return (
                          <div
                            key={product.pos_product_id}
                            className={`rounded-lg border p-3 relative cursor-pointer hover:border-[var(--color-ak-borgona)]/40 hover:bg-[var(--color-ak-borgona)]/5 transition-colors duration-200 ${
                              isLinked
                                ? 'border-[var(--color-ak-dorado)]/30 bg-[var(--color-ak-dorado)]/5'
                                : 'border-[var(--border-default)] bg-[var(--bg-card)]'
                            }`}
                            onClick={() => fetchPosRecipe(product.pos_product_id)}
                          >
                            {isLinked && (
                              <span className="absolute top-2 right-2 rounded-full bg-[var(--color-ak-dorado)]/20 px-2 py-0.5 text-[9px] font-medium text-[var(--color-ak-dorado)]">
                                En menu
                              </span>
                            )}

                            <h4 className="text-sm font-medium text-[var(--text-primary)] pr-16 mb-1">
                              {product.name}
                            </h4>

                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-[var(--color-ak-borgona)]">
                                {product.price != null ? formatCOP(product.price) : '--'}
                              </span>

                              {!isLinked && (
                                <button
                                  type="button"
                                  onClick={() => { setAddModalProduct(product); setAddModalCategory(''); setAddError(null) }}
                                  className="flex items-center gap-1 rounded-lg bg-[var(--color-ak-borgona)] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 active:scale-[0.97] transition-transform duration-200"
                                >
                                  <Plus size={12} />
                                  Agregar
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            /* ====== Category grid ====== */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedGroupKeys.map(groupId => {
                const products = groupedPOS[groupId] || []
                const group = posGroups.find(g => g.pos_group_id === groupId)
                const linkedCount = products.filter(p => !!p.linked_menu_item_id).length
                return (
                  <button
                    key={groupId}
                    type="button"
                    onClick={() => setSelectedPosGroup(groupId)}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 text-center hover:border-[var(--color-ak-borgona)]/40 hover:bg-[var(--color-ak-borgona)]/5 active:scale-[0.98] transition-all duration-200"
                  >
                    <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-ak-borgona)]">
                      {group?.name || 'Sin grupo'}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {products.length} {products.length === 1 ? 'producto' : 'productos'}
                    </span>
                    {linkedCount > 0 && (
                      <span className="rounded-full bg-[var(--color-ak-dorado)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-ak-dorado)]">
                        {linkedCount} en menu
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =================== TAB: Vinculacion =================== */}
      {activeTab === 'linking' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Items del menu vinculados con productos del POS. Verifica las vinculaciones y corrige las que no coincidan.
          </p>

          {linkingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={28} className="animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : items.filter(i => i.pos_product_id).length === 0 ? (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] py-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No hay items vinculados</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Vincula productos POS desde el catalogo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.filter(i => i.pos_product_id).map(item => {
                const mapping = mappings.find(m => m.menu_item_id === item.id)
                const confidence = mapping?.confidence || 'manual'
                const isVerified = mapping?.verified ?? false

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      isVerified
                        ? 'border-[var(--color-ak-oliva)]/30 bg-[var(--color-ak-oliva)]/5'
                        : 'border-[var(--color-ak-dorado)]/30 bg-[var(--color-ak-dorado)]/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                            confidence === 'exact'
                              ? 'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)]'
                              : confidence === 'fuzzy'
                              ? 'bg-[var(--color-ak-dorado)]/10 text-[var(--color-ak-dorado)]'
                              : 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                          }`}>
                            {confidence === 'exact' ? 'Exacta' : confidence === 'fuzzy' ? 'Aproximada' : 'Manual'}
                          </span>
                          {isVerified && (
                            <CheckCircle size={14} weight="fill" className="text-[var(--color-ak-oliva)]" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          POS: {item.pos_product_id}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {!isVerified && mapping && (
                          <button
                            type="button"
                            onClick={() => handleVerifyMapping(mapping.id)}
                            className="flex items-center gap-1 rounded-lg bg-[var(--color-ak-oliva)] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--color-ak-oliva)]/90 active:scale-[0.97] transition-transform duration-200"
                          >
                            <CheckCircle size={12} />
                            Verificar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setLinkSearchOpen(item.id)
                            setLinkSearchQuery('')
                            setLinkSearchResults([])
                          }}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)] active:scale-[0.97] transition-transform duration-200"
                        >
                          <ArrowsLeftRight size={12} />
                          Cambiar
                        </button>
                      </div>
                    </div>

                    {/* Inline search for changing link */}
                    <AnimatePresence>
                      {linkSearchOpen === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                            <div className="relative">
                              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                              <input
                                type="text"
                                value={linkSearchQuery}
                                onChange={e => handleLinkSearch(e.target.value, item.id)}
                                placeholder="Buscar producto POS..."
                                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                                autoFocus
                              />
                            </div>
                            {linkSearchLoading && (
                              <div className="py-3 text-center">
                                <Spinner size={20} className="animate-spin text-[var(--text-secondary)] mx-auto" />
                              </div>
                            )}
                            {linkSearchResults.length > 0 && (
                              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
                                {linkSearchResults.map(p => (
                                  <button
                                    key={p.pos_product_id}
                                    type="button"
                                    onClick={() => handleLinkProduct(item.id, p.pos_product_id)}
                                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg-input)] flex items-center justify-between transition-colors duration-150"
                                  >
                                    <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                                    <span className="text-xs text-[var(--text-secondary)]">{p.price != null ? formatCOP(p.price) : ''}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setLinkSearchOpen(null)}
                              className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =================== ADD TO MENU MODAL =================== */}
      {addModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddModalProduct(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                Agregar al Menu
              </h2>
              <button type="button" onClick={() => setAddModalProduct(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <span className="font-medium text-[var(--text-primary)]">{addModalProduct.name}</span>
              {' - '}
              {addModalProduct.price != null ? formatCOP(addModalProduct.price) : 'Sin precio'}
            </p>

            {addError && (
              <div className="mb-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 text-sm text-[var(--color-danger)]">
                {addError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Categoria del menu</label>
                <select
                  value={addModalCategory}
                  onChange={e => setAddModalCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                >
                  <option value="">Seleccionar categoria...</option>
                  {categories.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToMenu}
                  disabled={!addModalCategory || adding}
                  className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50 active:scale-[0.97] transition-transform duration-200"
                >
                  {adding ? 'Agregando...' : 'Agregar'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalProduct(null)}
                  className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97] transition-transform duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== RECIPE PANEL (Slide-over) =================== */}
      <AnimatePresence>
        {recipeItem && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--border-default)] shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                Receta
              </h2>
              <button
                type="button"
                onClick={() => { setRecipeItem(null); setRecipeData(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
              >
                <X size={18} />
              </button>
            </div>

            {recipeLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size={28} className="animate-spin text-[var(--text-secondary)]" />
              </div>
            ) : recipeData ? (
              <div className="p-5 space-y-5">
                {/* Menu item info */}
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
                    {recipeData.menuItem.name}
                  </h3>
                  {recipeData.posProduct && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Vinculado a: {recipeData.posProduct.name}
                    </p>
                  )}
                </div>

                {/* Ingredients table */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Ingredientes</h4>
                  {recipeData.recipe.ingredients.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] py-4 text-center">Sin ingredientes registrados</p>
                  ) : (
                    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--bg-input)] text-[var(--text-secondary)]">
                            <th className="text-left px-3 py-2 text-xs font-medium">Ingrediente</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">Cant.</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">Unidad</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">C. Unit.</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">C. Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipeData.recipe.ingredients.map((ing, idx) => (
                            <tr key={ing.pos_ingredient_id} className={idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-input)]/30'}>
                              <td className="px-3 py-2 text-[var(--text-primary)]">{ing.name}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-primary)]">{ing.quantity}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{ing.unit}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{formatCOP(ing.unitCost)}</td>
                              <td className="px-3 py-2 text-right font-medium text-[var(--color-ak-borgona)]">{formatCOP(ing.totalCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Costo total</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(recipeData.recipe.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Precio venta</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(recipeData.recipe.sellPrice)}</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] pt-2 flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Margen</span>
                    <span className={`font-mono font-bold ${
                      recipeData.recipe.margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-[var(--color-danger)]'
                    }`}>
                      {formatCOP(recipeData.recipe.margin)} ({recipeData.recipe.marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">No se pudo cargar la receta</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== Overlay for recipe panel =================== */}
      {(recipeItem || posRecipeProduct) && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => { setRecipeItem(null); setRecipeData(null); setPosRecipeProduct(null); setPosRecipeData(null) }}
        />
      )}

      {/* =================== POS PRODUCT RECIPE PANEL (Slide-over) =================== */}
      <AnimatePresence>
        {posRecipeProduct && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--border-default)] shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)]">
                Detalle del producto
              </h2>
              <button
                type="button"
                onClick={() => { setPosRecipeProduct(null); setPosRecipeData(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50"
              >
                <X size={18} />
              </button>
            </div>

            {posRecipeLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size={28} className="animate-spin text-[var(--text-secondary)]" />
              </div>
            ) : posRecipeData ? (
              <div className="p-5 space-y-5">
                {/* Product info */}
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
                    {posRecipeData.posProduct.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {posRecipeData.posProduct.groupName}
                  </p>
                  {posRecipeData.linkedMenuItem && (
                    <p className="text-xs text-[var(--color-ak-dorado)] mt-1">
                      Vinculado a: {posRecipeData.linkedMenuItem.name}
                    </p>
                  )}
                </div>

                {/* Price info */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Precio venta</span>
                    <span className="font-mono font-bold text-[var(--color-ak-borgona)]">{formatCOP(posRecipeData.price)}</span>
                  </div>
                  {posRecipeData.priceBeforeTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Precio sin impuesto</span>
                      <span className="font-mono text-[var(--text-primary)]">{formatCOP(posRecipeData.priceBeforeTax)}</span>
                    </div>
                  )}
                </div>

                {/* Ingredients table */}
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Ingredientes</h4>
                  {posRecipeData.recipe.ingredients.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] py-4 text-center">Sin ingredientes registrados</p>
                  ) : (
                    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--bg-input)] text-[var(--text-secondary)]">
                            <th className="text-left px-3 py-2 text-xs font-medium">Ingrediente</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">Cant.</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">Unidad</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">C. Unit.</th>
                            <th className="text-right px-3 py-2 text-xs font-medium">C. Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posRecipeData.recipe.ingredients.map((ing, idx) => (
                            <tr key={ing.pos_ingredient_id} className={idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-input)]/30'}>
                              <td className="px-3 py-2 text-[var(--text-primary)]">{ing.name}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-primary)]">{ing.quantity}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{ing.unit}</td>
                              <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{formatCOP(ing.unitCost)}</td>
                              <td className="px-3 py-2 text-right font-medium text-[var(--color-ak-borgona)]">{formatCOP(ing.totalCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Costo total</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(posRecipeData.recipe.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Precio venta</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(posRecipeData.recipe.sellPrice)}</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] pt-2 flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Margen</span>
                    <span className={`font-mono font-bold ${
                      posRecipeData.recipe.margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-[var(--color-danger)]'
                    }`}>
                      {formatCOP(posRecipeData.recipe.margin)} ({posRecipeData.recipe.marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">No se pudo cargar el detalle</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================== Forms =================== */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(null) }}
          onSaved={fetchMenu}
        />
      )}

      {showItemForm && (
        <MenuItemForm
          item={editingItem}
          categories={categories}
          onClose={() => { setShowItemForm(false); setEditingItem(null) }}
          onSaved={fetchMenu}
        />
      )}
    </div>
  )
}