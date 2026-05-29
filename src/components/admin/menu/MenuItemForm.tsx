'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, MagnifyingGlass, Plus, Trash, Spinner } from '@phosphor-icons/react'
import { formatCOP } from '@/lib/utils/formatCOP'

interface Category {
  id: string
  name: string
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
}

interface IngredientSearchResult {
  pos_ingredient_id: string
  name: string
  unit: string
  is_composite: boolean
  category_name: string
  avg_cost: number
  cost: number
}

interface SavedIngredient {
  id: string
  pos_ingredient_id: string
  name: string
  unit: string
  quantity: number
  avg_cost: number
  total_cost: number
  is_composite: boolean
}

interface MenuItemFormProps {
  item: MenuItem | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function MenuItemForm({ item, categories, onClose, onSaved }: MenuItemFormProps) {
  const isEditing = !!item
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item?.price?.toString() || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || (categories[0]?.id || ''))
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ingredient state
  const [ingredients, setIngredients] = useState<SavedIngredient[]>([])
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load existing ingredients when editing
  useEffect(() => {
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (data.ingredients) {
            setIngredients(data.ingredients)
          }
          setIngredientsLoaded(true)
        })
        .catch(() => setIngredientsLoaded(true))
    } else {
      setIngredientsLoaded(true)
    }
  }, [item?.id])

  // Search ingredients with debounce
  const searchIngredients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/pos-ingredients?search=${encodeURIComponent(query)}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        // Filter out already added ingredients
        const existingIds = new Set(ingredients.map(i => i.pos_ingredient_id))
        setSearchResults((data.ingredients || []).filter((i: IngredientSearchResult) => !existingIds.has(i.pos_ingredient_id)))
      }
    } catch {
      // Silently fail
    } finally {
      setSearchLoading(false)
    }
  }, [ingredients])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchIngredients(value), 300)
  }

  const addIngredient = (ingredient: IngredientSearchResult) => {
    // If editing existing item, save to DB immediately
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: ingredient.pos_ingredient_id, quantity: 1 }),
      }).then(res => {
        if (res.ok) return res.json()
        throw new Error('Failed')
      }).then(data => {
        setIngredients(prev => [...prev, {
          id: data.id,
          pos_ingredient_id: ingredient.pos_ingredient_id,
          name: ingredient.name,
          unit: ingredient.unit,
          quantity: 1,
          avg_cost: ingredient.avg_cost,
          total_cost: ingredient.avg_cost,
          is_composite: ingredient.is_composite,
        }])
      }).catch(() => {})
    } else {
      setIngredients(prev => [...prev, {
        id: `temp-${ingredient.pos_ingredient_id}`,
        pos_ingredient_id: ingredient.pos_ingredient_id,
        name: ingredient.name,
        unit: ingredient.unit,
        quantity: 1,
        avg_cost: ingredient.avg_cost,
        total_cost: ingredient.avg_cost,
        is_composite: ingredient.is_composite,
      }])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeIngredient = (ingredientId: string, posIngredientId: string) => {
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: posIngredientId }),
      }).then(() => {
        setIngredients(prev => prev.filter(i => i.pos_ingredient_id !== posIngredientId))
      }).catch(() => {})
    } else {
      setIngredients(prev => prev.filter(i => i.pos_ingredient_id !== posIngredientId))
    }
  }

  const updateQuantity = (posIngredientId: string, quantity: number) => {
    setIngredients(prev => prev.map(i =>
      i.pos_ingredient_id === posIngredientId
        ? { ...i, quantity, total_cost: i.avg_cost * quantity }
        : i
    ))
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: posIngredientId, quantity }),
      }).catch(() => {})
    }
  }

  // Calculate totals
  const totalIngredientCost = ingredients.reduce((sum, i) => sum + i.total_cost, 0)
  const sellPrice = parseFloat(price) || 0
  const margin = sellPrice - totalIngredientCost
  const marginPercent = sellPrice > 0 ? (margin / sellPrice) * 100 : 0

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Nombre requerido'); return }
    if (!price || parseFloat(price) < 0) { setError('Precio invalido'); return }
    if (!categoryId) { setError('Categoria requerida'); return }

    setSaving(true)
    try {
      const url = isEditing ? `/api/admin/menu/items/${item!.id}` : '/api/admin/menu/items'
      const method = isEditing ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId,
        image_url: imageUrl || null,
        is_featured: isFeatured,
      }

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Error'); return }

      // If creating new item, save ingredients
      if (!isEditing && d.id && ingredients.length > 0) {
        for (const ing of ingredients) {
          await fetch(`/api/admin/menu/items/${d.id}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pos_ingredient_id: ing.pos_ingredient_id, quantity: ing.quantity }),
          }).catch(() => {}) // Best effort
        }
      }

      onSaved()
      onClose()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [item, name, description, price, categoryId, imageUrl, isFeatured, ingredients, isEditing, onSaved, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Editar Plato' : 'Nuevo Plato'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-[var(--color-danger)]/10 border border-red-200 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="Hummus de garbanzos" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Descripcion</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="Descripcion del plato..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Precio (COP)</label>
              <input type="number" min="0" step="500" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="18000" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none">
                {categories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">URL de imagen</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={e => setIsFeatured(e.target.checked)}
              className="rounded border-[var(--border-default)] text-[var(--color-ak-borgona)] focus:ring-[var(--color-ak-borgona)]"
            />
            <label htmlFor="featured" className="text-xs text-[var(--text-primary)]">Destacado</label>
          </div>

          {/* ======== INGREDIENTS SECTION ======== */}
          <div className="border-t border-[var(--border-default)] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[var(--text-primary)]">
                Ingredientes
              </h3>
              {ingredients.length > 0 && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {ingredients.length} {ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
                </span>
              )}
            </div>

            {/* Search input */}
            <div className="relative mb-3" ref={searchRef}>
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { handleSearchChange(e.target.value); setShowSearch(true) }}
                onFocus={() => setShowSearch(true)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                placeholder="Buscar ingrediente del POS..."
              />
              {searchLoading && (
                <Spinner size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-secondary)]" />
              )}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg">
                  {searchResults.map(ing => (
                    <button
                      key={ing.pos_ingredient_id}
                      type="button"
                      onClick={() => addIngredient(ing)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-ak-borgona)]/5 active:bg-[var(--color-ak-borgona)]/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[var(--text-primary)] truncate">{ing.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {ing.category_name} &middot; {ing.unit}{ing.is_composite ? ' (subreceta)' : ''}
                        </div>
                      </div>
                      <span className="ml-2 text-xs font-mono text-[var(--color-ak-borgona)]">
                        {formatCOP(ing.avg_cost)}/{ing.unit.toLowerCase()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ingredient list */}
            {ingredients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-default)] py-6 text-center">
                <p className="text-sm text-[var(--text-secondary)]">Busca y agrega ingredientes del POS</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Los costos se calculan automaticamente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ingredients.map(ing => (
                  <div key={ing.pos_ingredient_id} className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--text-primary)] truncate">
                        {ing.name}
                        {ing.is_composite && (
                          <span className="ml-1.5 rounded bg-[var(--color-ak-borgona)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-ak-borgona)]">sub</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {formatCOP(ing.avg_cost)}/{ing.unit.toLowerCase()} &middot; Total: {formatCOP(ing.total_cost)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={ing.quantity}
                        onChange={e => updateQuantity(ing.pos_ingredient_id, parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1 text-xs text-center text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                      />
                      <span className="text-[11px] text-[var(--text-secondary)]">{ing.unit}</span>
                      <button
                        type="button"
                        onClick={() => removeIngredient(ing.id, ing.pos_ingredient_id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cost summary */}
            {ingredients.length > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Costo ingredientes</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(totalIngredientCost)}</span>
                </div>
                {sellPrice > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Precio venta</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(sellPrice)}</span>
                    </div>
                    <div className="border-t border-[var(--border-default)] pt-2 flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Margen</span>
                      <span className={`font-mono font-bold ${margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-[var(--color-danger)]'}`}>
                        {formatCOP(margin)} ({marginPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50 active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Plato'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}