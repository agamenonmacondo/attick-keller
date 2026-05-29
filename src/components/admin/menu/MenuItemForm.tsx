'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface IngredientCategory {
  pos_category_id: string
  name: string
  classification: string
  ingredient_count: number
}

interface IngResult {
  pos_ingredient_id: string
  name: string
  unit: string
  is_composite: boolean
  category_name: string
  avg_cost: number
}

interface AddedIng {
  pos_ingredient_id: string
  name: string
  unit: string
  quantity: number
  avg_cost: number
  category_name: string
  is_composite: boolean
}

interface Props {
  item: MenuItem | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function MenuItemForm({ item, categories, onClose, onSaved }: Props) {
  const isEditing = !!item

  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item?.price?.toString() || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '')
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [added, setAdded] = useState<AddedIng[]>([])
  const [ingCats, setIngCats] = useState<IngredientCategory[]>([])
  const [catItems, setCatItems] = useState<Record<string, IngResult[]>>({})
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [loadingCat, setLoadingCat] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/pos-ingredient-categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setIngCats(d.categories) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!item?.id) return
    fetch(`/api/admin/menu/items/${item.id}/ingredients`)
      .then(r => r.json())
      .then(d => {
        if (d.ingredients) {
          setAdded(d.ingredients.map((i: any) => ({
            pos_ingredient_id: i.pos_ingredient_id,
            name: i.name,
            unit: i.unit,
            quantity: i.quantity,
            avg_cost: i.avg_cost,
            category_name: i.category_name || '',
            is_composite: i.is_composite || false,
          })))
        }
      })
      .catch(() => {})
  }, [item?.id])

  const toggleCat = useCallback(async (catId: string) => {
    if (openCat === catId) { setOpenCat(null); return }
    if (!catItems[catId]) {
      setLoadingCat(catId)
      try {
        const r = await fetch(`/api/admin/pos-ingredients?category=${catId}&limit=500&include_bar=true&include_wine=true`)
        const d = await r.json()
        setCatItems(prev => ({ ...prev, [catId]: d.ingredients || [] }))
      } catch {}
      setLoadingCat(null)
    }
    setOpenCat(catId)
  }, [openCat, catItems])

  const add = (ing: IngResult) => {
    if (added.some(a => a.pos_ingredient_id === ing.pos_ingredient_id)) {
      remove(ing.pos_ingredient_id)
      return
    }
    const newIng: AddedIng = {
      pos_ingredient_id: ing.pos_ingredient_id,
      name: ing.name,
      unit: ing.unit,
      quantity: 1,
      avg_cost: ing.avg_cost || 0,
      category_name: ing.category_name || '',
      is_composite: ing.is_composite,
    }
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: ing.pos_ingredient_id, quantity: 1 }),
      }).catch(() => {})
    }
    setAdded(prev => [...prev, newIng])
  }

  const remove = (posId: string) => {
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: posId }),
      }).catch(() => {})
    }
    setAdded(prev => prev.filter(a => a.pos_ingredient_id !== posId))
  }

  const updateQty = (posId: string, qty: number) => {
    setAdded(prev => prev.map(a =>
      a.pos_ingredient_id === posId ? { ...a, quantity: qty } : a
    ))
    if (item?.id) {
      fetch(`/api/admin/menu/items/${item.id}/ingredients`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_ingredient_id: posId, quantity: qty }),
      }).catch(() => {})
    }
  }

  const totalCost = added.reduce((s, a) => s + a.avg_cost * a.quantity, 0)
  const sellPrice = parseFloat(price) || 0
  const margin = sellPrice - totalCost
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Nombre requerido'); return }
    if (!price || parseFloat(price) < 0) { setError('Precio invalido'); return }
    if (!categoryId) { setError('Categoria requerida'); return }

    setSaving(true)
    try {
      const url = isEditing ? `/api/admin/menu/items/${item!.id}` : '/api/admin/menu/items'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          price: parseFloat(price),
          category_id: categoryId,
          image_url: imageUrl || null,
          is_featured: isFeatured,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Error'); return }

      if (!isEditing && d.id) {
        for (const ing of added) {
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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] shrink-0">
          <h2 className="font-[Playfair_Display] text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Editar plato' : 'Nuevo plato'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Basic info */}
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Ej: Pizza Margherita" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Descripcion</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Descripcion del plato..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Precio (COP)</label>
              <input type="number" min="0" step="500" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
                placeholder="37000" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Categoria menu</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none">
                {categories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">URL imagen</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="https://..." />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)}
              className="rounded border-[var(--border-default)] text-[var(--color-ak-borgona)]" />
            <span className="text-xs text-[var(--text-primary)]">Destacado</span>
          </label>

          {/* ====== INGREDIENTS ====== */}
          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ingredientes</h3>
              {added.length > 0 && (
                <span className="text-xs text-[var(--text-secondary)]">{added.length} agregados</span>
              )}
            </div>

            {/* Added list */}
            {added.length > 0 && (
              <div className="mb-3 space-y-1">
                {added.map(a => (
                  <div key={a.pos_ingredient_id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--bg-input)]/50">
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-[var(--text-primary)] truncate block">
                        {a.name}{a.is_composite && <span className="ml-1 text-[8px] text-amber-600">(sub)</span>}
                      </span>
                      <span className="text-[9px] text-[var(--text-secondary)]">{formatCOP(a.avg_cost)}/{a.unit.toLowerCase()}</span>
                    </div>
                    <input type="number" min="0.01" step="0.1" value={a.quantity}
                      onChange={e => updateQty(a.pos_ingredient_id, parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-[var(--border-default)] bg-[var(--bg-input)] px-1 py-0.5 text-xs text-center text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" />
                    <span className="text-[9px] text-[var(--text-secondary)] w-5">{a.unit}</span>
                    <span className="text-xs font-mono text-[var(--color-ak-borgona)] w-[70px] text-right">{formatCOP(a.avg_cost * a.quantity)}</span>
                    <button type="button" onClick={() => remove(a.pos_ingredient_id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600">
                      <Trash size={11} />
                    </button>
                  </div>
                ))}

                {/* Summary */}
                <div className="px-2 py-2 rounded bg-[var(--bg-card)] border border-[var(--border-default)] text-[12px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Costo ingredientes</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(totalCost)}</span>
                  </div>
                  {sellPrice > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Precio venta</span>
                        <span className="font-mono font-medium text-[var(--text-primary)]">{formatCOP(sellPrice)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--border-default)] pt-1">
                        <span className="text-[var(--text-secondary)]">Margen</span>
                        <span className={`font-mono font-bold ${margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-red-500'}`}>
                          {formatCOP(margin)} ({marginPct.toFixed(1)}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {added.length === 0 && (
              <p className="text-center text-sm text-[var(--text-secondary)] py-3 mb-3 border border-dashed border-[var(--border-default)] rounded-lg">
                Selecciona ingredientes de las categorias
              </p>
            )}

            {/* Category accordion */}
            <div className="space-y-1">
              <p className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">Categorias de ingredientes</p>
              {ingCats.map(cat => {
                const isOpen = openCat === cat.pos_category_id
                const isLoading = loadingCat === cat.pos_category_id
                const items = catItems[cat.pos_category_id] || []
                const addedCount = added.filter(a => items.some(i => i.pos_ingredient_id === a.pos_ingredient_id)).length

                return (
                  <div key={cat.pos_category_id} className="rounded border border-[var(--border-default)] overflow-hidden">
                    <button type="button" onClick={() => toggleCat(cat.pos_category_id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--color-ak-borgona)]/5 text-left">
                      <div className="flex items-center gap-2">
                        {isOpen ? <CaretDown size={11} className="text-[var(--color-ak-borgona)]" /> : <CaretRight size={11} className="text-[var(--text-secondary)]" />}
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">{cat.name}</span>
                        {addedCount > 0 && (
                          <span className="rounded-full bg-[var(--color-ak-borgona)]/10 px-1.5 py-0.5 text-[8px] font-medium text-[var(--color-ak-borgona)]">{addedCount}</span>
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--text-secondary)]">{cat.ingredient_count}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-[var(--border-default)] max-h-48 overflow-y-auto">
                        {isLoading ? (
                          <div className="flex justify-center py-6"><Spinner size={14} className="animate-spin text-[var(--text-secondary)]" /></div>
                        ) : items.length === 0 ? (
                          <p className="text-center text-[11px] text-[var(--text-secondary)] py-3">Sin ingredientes</p>
                        ) : (
                          items.map(ing => {
                            const isAdded = added.some(a => a.pos_ingredient_id === ing.pos_ingredient_id)
                            return (
                              <div key={ing.pos_ingredient_id}
                                className={`flex items-center justify-between px-3 py-1 border-b border-[var(--border-default)]/30 last:border-0 hover:bg-[var(--bg-input)]/50 ${isAdded ? 'bg-[var(--color-ak-borgona)]/[0.03]' : ''}`}>
                                <div className="min-w-0 flex-1 mr-2">
                                  <span className="text-[11px] text-[var(--text-primary)] truncate block">
                                    {ing.name}
                                    {ing.is_composite && <span className="ml-1 text-[8px] text-amber-600">(subreceta)</span>}
                                  </span>
                                  <span className="text-[8px] text-[var(--text-secondary)]">{formatCOP(ing.avg_cost)}/{ing.unit.toLowerCase()}</span>
                                </div>
                                <button type="button" onClick={() => add(ing)}
                                  className={`flex items-center gap-0.5 rounded px-2 py-0.5 text-[9px] font-medium shrink-0 ${
                                    isAdded
                                      ? 'bg-[var(--color-ak-dorado)]/15 text-[var(--color-ak-dorado)]'
                                      : 'bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90'
                                  }`}>
                                  <Plus size={9} />
                                  {isAdded ? 'Agregado' : 'Agregar'}
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-default)] shrink-0 flex gap-3">
          <button type="submit" form="item-form" disabled={saving}
            className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50">
            {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear plato'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)]">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}