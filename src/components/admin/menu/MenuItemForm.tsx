'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, CaretDown, CaretRight, Plus, Trash, Spinner } from '@phosphor-icons/react'
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

interface IngredientResult {
  pos_ingredient_id: string
  name: string
  unit: string
  is_composite: boolean
  category_name: string
  avg_cost: number
  cost: number
}

interface IngredientCategory {
  pos_category_id: string
  name: string
  classification: string
  priority: number
  ingredient_count: number
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
  category_name: string
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
  const [ingCategories, setIngCategories] = useState<IngredientCategory[]>([])
  const [ingByCategory, setIngByCategory] = useState<Record<string, IngredientResult[]>>({})
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [loadingCats, setLoadingCats] = useState<Set<string>>(new Set())

  // Load existing ingredients when editing
  useEffect(() => {
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`)
        .then(res => res.ok ? res.json() : { ingredients: [] })
        .then(data => {
          if (data.ingredients) setIngredients(data.ingredients)
        })
        .catch(() => {})
    }
  }, [item?.id])

  // Load ingredient categories on mount
  useEffect(() => {
    fetch('/api/admin/pos-ingredient-categories')
      .then(res => res.ok ? res.json() : { categories: [] })
      .then(data => {
        if (data.categories) setIngCategories(data.categories)
      })
      .catch(() => {})
  }, [])

  // Load ingredients for a category
  const loadCategoryIngredients = useCallback(async (catId: string) => {
    if (ingByCategory[catId]) {
      // Toggle expand/collapse
      setExpandedCats(prev => {
        const next = new Set(prev)
        if (next.has(catId)) next.delete(catId)
        else next.add(catId)
        return next
      })
      return
    }
    // Load from API
    setLoadingCats(prev => new Set(prev).add(catId))
    try {
      const res = await fetch(`/api/admin/pos-ingredients?category=${encodeURIComponent(catId)}&limit=500&include_bar=true&include_wine=true`)
      if (res.ok) {
        const data = await res.json()
        setIngByCategory(prev => ({ ...prev, [catId]: data.ingredients || [] }))
        setExpandedCats(prev => new Set(prev).add(catId))
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingCats(prev => {
        const next = new Set(prev)
        next.delete(catId)
        return next
      })
    }
  }, [ingByCategory])

  const addIngredient = (ing: IngredientResult) => {
    const existing = ingredients.find(i => i.pos_ingredient_id === ing.pos_ingredient_id)
    if (existing) return

    const newIng: SavedIngredient = {
      id: `temp-${ing.pos_ingredient_id}`,
      pos_ingredient_id: ing.pos_ingredient_id,
      name: ing.name,
      unit: ing.unit,
      quantity: 1,
      avg_cost: ing.avg_cost || 0,
      total_cost: ing.avg_cost || 0,
      is_composite: ing.is_composite,
      category_name: ing.category_name || '',
    }

    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: ing.pos_ingredient_id, quantity: 1 }),
      }).then(res => res.ok ? res.json() : Promise.reject()).then(data => {
        setIngredients(prev => [...prev, { ...newIng, id: data.id || newIng.id }])
      }).catch(() => setIngredients(prev => [...prev, newIng]))
    } else {
      setIngredients(prev => [...prev, newIng])
    }
  }

  const removeIngredient = (posIngredientId: string) => {
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: posIngredientId }),
      }).catch(() => {})
    }
    setIngredients(prev => prev.filter(i => i.pos_ingredient_id !== posIngredientId))
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

  // Group added ingredients by category
  const addedByCategory: Record<string, SavedIngredient[]> = {}
  for (const ing of ingredients) {
    const cat = ing.category_name || 'Sin categoria'
    if (!addedByCategory[cat]) addedByCategory[cat] = []
    addedByCategory[cat].push(ing)
  }

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
          }).catch(() => {})
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
          {/* ======== BASIC INFO ======== */}
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
            <input type="checkbox" id="featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded border-[var(--border-default)] text-[var(--color-ak-borgona)] focus:ring-[var(--color-ak-borgona)]" />
            <label htmlFor="featured" className="text-xs text-[var(--text-primary)]">Destacado</label>
          </div>

          {/* ======== INGREDIENTS SECTION ======== */}
          <div className="border-t border-[var(--border-default)] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-['Playfair_Display'] text-sm font-semibold text-[var(--text-primary)]">
                Ingredientes
              </h3>
              {ingredients.length > 0 && (
                <span className="rounded-full bg-[var(--color-ak-borgona)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ak-borgona)]">
                  {ingredients.length}
                </span>
              )}
            </div>

            {/* Added ingredients grouped by category */}
            {ingredients.length > 0 && (
              <div className="mb-4 space-y-2">
                {Object.entries(addedByCategory).map(([catName, ings]) => (
                  <div key={catName} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                    <div className="bg-[var(--bg-input)]/60 px-3 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">{catName}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{formatCOP(ings.reduce((s, i) => s + i.total_cost, 0))}</span>
                    </div>
                    <div className="divide-y divide-[var(--border-default)]/50">
                      {ings.map(ing => (
                        <div key={ing.pos_ingredient_id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-input)]/30">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] text-[var(--text-primary)] truncate">
                              {ing.name}
                              {ing.is_composite && (
                                <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">subreceta</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)]">
                              {formatCOP(ing.avg_cost)}/{ing.unit.toLowerCase()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min="0.01"
                              step="0.1"
                              value={ing.quantity}
                              onChange={e => updateQuantity(ing.pos_ingredient_id, parseFloat(e.target.value) || 0)}
                              className="w-14 rounded border border-[var(--border-default)] bg-[var(--bg-input)] px-1.5 py-0.5 text-xs text-center text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                            />
                            <span className="text-[10px] text-[var(--text-secondary)]">{ing.unit}</span>
                            <span className="text-xs font-mono font-medium text-[var(--color-ak-borgona)] min-w-[70px] text-right">{formatCOP(ing.total_cost)}</span>
                            <button
                              type="button"
                              onClick={() => removeIngredient(ing.pos_ingredient_id)}
                              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-danger)]/70 hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Cost summary */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 space-y-1.5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[var(--text-secondary)]">Costo ingredientes</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(totalIngredientCost)}</span>
                  </div>
                  {sellPrice > 0 && (
                    <>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[var(--text-secondary)]">Precio venta</span>
                        <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(sellPrice)}</span>
                      </div>
                      <div className="border-t border-[var(--border-default)] pt-1.5 flex justify-between text-[13px]">
                        <span className="text-[var(--text-secondary)]">Margen</span>
                        <span className={`font-mono font-bold ${margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-[var(--color-danger)]'}`}>
                          {formatCOP(margin)} ({marginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {ingredients.length === 0 && (
              <div className="rounded-lg border border-dashed border-[var(--border-default)] py-8 text-center mb-4">
                <p className="text-sm text-[var(--text-secondary)]">Selecciona ingredientes de las categorias</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Los costos se calculan automaticamente</p>
              </div>
            )}

            {/* ======== CATEGORY ACCORDION ======== */}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                Agregar ingredientes
              </p>
              {ingCategories.length === 0 && (
                <div className="flex items-center justify-center py-6">
                  <Spinner size={20} className="animate-spin text-[var(--text-secondary)]" />
                </div>
              )}
              {ingCategories.map(cat => {
                const isExpanded = expandedCats.has(cat.pos_category_id)
                const isLoading = loadingCats.has(cat.pos_category_id)
                const catItems = ingByCategory[cat.pos_category_id] || []
                // Count how many from this category are already added
                const addedFromCat = ingredients.filter(i =>
                  catItems.some(c => c.pos_ingredient_id === i.pos_ingredient_id)
                ).length

                return (
                  <div key={cat.pos_category_id} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                    {/* Category header */}
                    <button
                      type="button"
                      onClick={() => loadCategoryIngredients(cat.pos_category_id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-ak-borgona)]/5 active:bg-[var(--color-ak-borgona)]/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <CaretDown size={14} className="text-[var(--color-ak-borgona)]" />
                        ) : (
                          <CaretRight size={14} className="text-[var(--text-secondary)]" />
                        )}
                        <span className="text-sm font-medium text-[var(--text-primary)]">{cat.name}</span>
                        {addedFromCat > 0 && (
                          <span className="rounded-full bg-[var(--color-ak-borgona)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-ak-borgona)]">
                            {addedFromCat}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)]">{cat.ingredient_count}</span>
                    </button>

                    {/* Expanded category items */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-default)] max-h-56 overflow-y-auto">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner size={18} className="animate-spin text-[var(--text-secondary)]" />
                          </div>
                        ) : catItems.length === 0 ? (
                          <div className="py-4 text-center text-xs text-[var(--text-secondary)]">
                            Sin ingredientes
                          </div>
                        ) : (
                          catItems.map(ing => {
                            const isAdded = ingredients.some(i => i.pos_ingredient_id === ing.pos_ingredient_id)
                            return (
                              <div
                                key={ing.pos_ingredient_id}
                                className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]/30 last:border-0 hover:bg-[var(--bg-input)]/50 transition-colors ${isAdded ? 'bg-[var(--color-ak-borgona)]/[0.03]' : ''}`}
                              >
                                <div className="min-w-0 flex-1 mr-2">
                                  <div className="text-[13px] text-[var(--text-primary)] truncate">
                                    {ing.name}
                                    {ing.is_composite && (
                                      <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">subreceta</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-secondary)]">
                                    {formatCOP(ing.avg_cost)}/{ing.unit.toLowerCase()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => addIngredient(ing)}
                                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium active:scale-[0.97] shrink-0 ${
                                    isAdded
                                      ? 'bg-[var(--color-ak-dorado)]/10 text-[var(--color-ak-dorado)] cursor-default'
                                      : 'bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90'
                                  }`}
                                  style={{ transition: 'transform 120ms ease-out' }}
                                >
                                  {isAdded ? (
                                    <><Plus size={12} weight="bold" /> Agregado</>
                                  ) : (
                                    <><Plus size={12} /> Agregar</>
                                  )}
                                </button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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