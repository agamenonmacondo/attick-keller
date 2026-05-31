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
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Editar Categoria' : 'Nueva Categoria'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-[var(--color-danger)]/10 border border-red-200 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="Entradas, Platos Fuertes..." />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Descripcion</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="Descripcion de la categoria" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Icono (emoji)</label>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none" placeholder="🥗" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50 active:scale-[0.97]" style={{ transition: 'transform 160ms ease-out' }}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Categoria'}
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