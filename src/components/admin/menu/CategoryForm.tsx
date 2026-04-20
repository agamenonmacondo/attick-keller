'use client'

import { useState, useCallback } from 'react'
import { X } from '@phosphor-icons/react'

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

interface CategoryFormProps {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}

export function CategoryForm({ category, onClose, onSaved }: CategoryFormProps) {
  const isEditing = !!category
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [icon, setIcon] = useState(category?.icon || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Nombre requerido'); return }

    setSaving(true)
    try {
      const url = isEditing ? `/api/admin/menu/categories/${category.id}` : '/api/admin/menu/categories'
      const method = isEditing ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = { name: name.trim(), description: description || null, icon: icon || null }
      if (!isEditing) body.sort_order = 0

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
  }, [category, name, description, icon, isEditing, onSaved, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#F5EDE0] border border-[#D7CCC8] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
            {isEditing ? 'Editar Categoria' : 'Nueva Categoria'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="Entradas, Platos Fuertes..." />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Descripcion</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="Descripcion de la categoria" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Icono (emoji)</label>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none" placeholder="🥗" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 disabled:opacity-50 active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Categoria'}
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