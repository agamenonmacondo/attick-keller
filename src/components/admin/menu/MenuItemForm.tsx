'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash, Spinner } from '@phosphor-icons/react'
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

interface IngItem {
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

  const [allIngredients, setAllIngredients] = useState<IngItem[]>([])
  const [added, setAdded] = useState<AddedIng[]>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Single fetch: all ingredients + categories in one call
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/admin/pos-ingredients?limit=1000&include_bar=false&include_wine=false').then(r => r.json()),
      item?.id
        ? fetch(`/api/admin/menu/items/${item.id}/ingredients`).then(r => r.json()).catch(() => ({ ingredients: [] }))
        : Promise.resolve({ ingredients: [] }),
    ])
      .then(([ingRes, savedRes]) => {
        if (cancelled) return
        const ingredients = ingRes?.ingredients || []
        setAllIngredients(ingredients)
        // Set default active category to first one
        if (ingredients.length > 0) {
          const firstCat = ingredients.find((i: IngItem) => i.category_name)?.category_name
          if (firstCat) setActiveCat(firstCat)
        }
        // Load saved ingredients
        if (savedRes?.ingredients?.length) {
          setAdded(savedRes.ingredients.map((i: any) => ({
            pos_ingredient_id: i.pos_ingredient_id,
            name: i.name,
            unit: i.unit,
            quantity: i.quantity,
            avg_cost: i.avg_cost,
            is_composite: i.is_composite || false,
          })))
        }
        setDataLoading(false)
      })
      .catch(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [item?.id])

  // Group ingredients by category
  const catGroups = useMemo(() => {
    const map = new Map<string, IngItem[]>()
    for (const ing of allIngredients) {
      const cat = ing.category_name || 'Sin categoria'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(ing)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [allIngredients])

  const addIng = (ing: IngItem) => {
    if (added.some(a => a.pos_ingredient_id === ing.pos_ingredient_id)) {
      removeIng(ing.pos_ingredient_id)
      return
    }
    const newIng: AddedIng = {
      pos_ingredient_id: ing.pos_ingredient_id,
      name: ing.name,
      unit: ing.unit,
      quantity: 1,
      avg_cost: ing.avg_cost || 0,
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

  const removeIng = (posId: string) => {
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          {/* Basic fields */}
          <form id="item-form" onSubmit={handleSubmit} className="space-y-3">
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
          </form>

          {/* ====== INGREDIENTES ====== */}
          <div className="border-t border-[var(--border-default)] pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ingredientes</h3>
              {added.length > 0 && (
                <span className="text-xs text-[var(--text-secondary)]">{added.length} agregados</span>
              )}
            </div>

            {/* Added ingredients list */}
            {added.length > 0 ? (
              <div className="mb-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] divide-y divide-[var(--border-default)]">
                {added.map(a => (
                  <div key={a.pos_ingredient_id} className="flex items-center gap-2 px-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-[var(--text-primary)] block truncate">
                        {a.name}
                        {a.is_composite && <span className="ml-1 text-[8px] text-[var(--color-ak-dorado)]">(sub)</span>}
                      </span>
                    </div>
                    <input type="number" min="0.01" step="0.1" value={a.quantity}
                      onChange={e => updateQty(a.pos_ingredient_id, parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-[var(--border-default)] bg-[var(--bg-input)] px-1 py-0.5 text-xs text-center text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" />
                    <span className="text-[10px] text-[var(--text-secondary)] w-6">{a.unit}</span>
                    <span className="text-xs font-mono text-[var(--color-ak-borgona)] w-[72px] text-right">{formatCOP(a.avg_cost * a.quantity)}</span>
                    <button type="button" onClick={() => removeIng(a.pos_ingredient_id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-500/10 hover:text-red-400">
                      <Trash size={11} />
                    </button>
                  </div>
                ))}
                {/* Summary */}
                <div className="px-3 py-2 space-y-1 text-[12px]">
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
                        <span className={`font-mono font-bold ${margin >= 0 ? 'text-[var(--color-ak-oliva)]' : 'text-red-400'}`}>
                          {formatCOP(margin)} ({marginPct.toFixed(1)}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-[var(--text-secondary)] py-2 mb-3 border border-dashed border-[var(--border-default)] rounded-lg">
                Selecciona ingredientes de las categorias
              </p>
            )}

            {/* Category pills + ingredient list */}
            {dataLoading ? (
              <div className="flex justify-center py-8"><Spinner size={20} className="animate-spin text-[var(--text-secondary)]" /></div>
            ) : catGroups.length === 0 ? (
              <p className="text-center text-xs text-[var(--text-secondary)] py-4">No se cargaron ingredientes</p>
            ) : (
              <>
                {/* Pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {catGroups.map(([catName, items]) => {
                    const isActive = activeCat === catName
                    const count = items.filter(i => added.some(a => a.pos_ingredient_id === i.pos_ingredient_id)).length
                    return (
                      <button key={catName} type="button" onClick={() => setActiveCat(isActive ? null : catName)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                          isActive
                            ? 'bg-[var(--color-ak-borgona)] text-white'
                            : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--color-ak-borgona)]/50'
                        }`}>
                        {catName}
                        {count > 0 && (
                          <span className={`rounded-full px-1 py-px text-[8px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)]'}`}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Ingredient list for active category */}
                {activeCat && (
                  <div className="rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)]/50 max-h-52 overflow-y-auto">
                    {(catGroups.find(([c]) => c === activeCat)?.[1] || []).map(ing => {
                      const isAdded = added.some(a => a.pos_ingredient_id === ing.pos_ingredient_id)
                      return (
                        <div key={ing.pos_ingredient_id}
                          className={`flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-input)]/50 ${isAdded ? 'bg-[var(--color-ak-borgona)]/[0.04]' : ''}`}>
                          <div className="min-w-0 flex-1 mr-3">
                            <span className="text-[12px] text-[var(--text-primary)] truncate block">
                              {ing.name}
                              {ing.is_composite && <span className="ml-1 text-[8px] text-[var(--color-ak-dorado)]">(subreceta)</span>}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)]">{formatCOP(ing.avg_cost)} / {ing.unit.toLowerCase()}</span>
                          </div>
                          <button type="button" onClick={() => addIng(ing)}
                            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-medium shrink-0 transition-colors ${
                              isAdded
                                ? 'bg-[var(--color-ak-dorado)]/15 text-[var(--color-ak-dorado)]'
                                : 'bg-[var(--color-ak-borgona)] text-white hover:bg-[var(--color-ak-borgona)]/90'
                            }`}>
                            <Plus size={10} />
                            {isAdded ? 'Agregado' : 'Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
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