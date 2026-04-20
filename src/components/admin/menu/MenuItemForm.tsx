'use client'

import { useState, useCallback } from 'react'
import { X } from '@phosphor-icons/react'

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Nombre requerido'); return }
    if (!price || parseFloat(price) < 0) { setError('Precio invalido'); return }
    if (!categoryId) { setError('Categoria requerida'); return }

    setSaving(true)
    try {
      const url = isEditing ? `/api/admin/menu/items/${item.id}` : '/api/admin/menu/items'
      const method = isEditing ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId,
        image_url: imageUrl || null,
        is_featured: isFeatured,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Error'); return }

      onSaved()
      onClose()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [item, name, description, price, categoryId, imageUrl, isFeatured, isEditing, onSaved, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#F5EDE0] border border-[#D7CCC8] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
            {isEditing ? 'Editar Plato' : 'Nuevo Plato'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="Hummus de garbanzos" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Descripcion</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="Descripcion del plato..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[#8D6E63]">Precio (COP)</label>
              <input type="number" min="0" step="500" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="18000" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8D6E63]">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none">
                {categories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">URL de imagen</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={e => setIsFeatured(e.target.checked)}
              className="rounded border-[#D7CCC8] text-[#6B2737] focus:ring-[#6B2737]"
            />
            <label htmlFor="featured" className="text-xs text-[#3E2723]">Destacado</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 disabled:opacity-50 active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Plato'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-[#D7CCC8] px-4 py-2.5 text-sm font-medium text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}