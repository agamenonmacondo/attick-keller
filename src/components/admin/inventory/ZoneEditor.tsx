'use client'

import { useState, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import type { Zone } from '@/lib/types/inventory'

interface ZoneEditorProps {
  zone?: Zone
  onClose: () => void
  onSave: () => void
}

export function ZoneEditor({ zone, onClose, onSave }: ZoneEditorProps) {
  const isEditing = !!zone
  const [name, setName] = useState(zone?.name || '')
  const [description, setDescription] = useState(zone?.description || '')
  const [sortOrder, setSortOrder] = useState(zone?.sort_order ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Nombre requerido'); return }

    setSaving(true)
    try {
      if (isEditing) {
        await fetch('/api/admin/inventory/zones', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: zone.id,
            name: name.trim(),
            description: description || null,
            sort_order: sortOrder,
          }),
        })
      } else {
        await fetch('/api/admin/inventory/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description || null,
            sort_order: sortOrder,
          }),
        })
      }
      onSave()
      onClose()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [zone, name, description, sortOrder, isEditing, onSave, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Editar Zona' : 'Nueva Zona'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border-default)]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Ej: Terraza, Salon Principal..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Descripcion</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              placeholder="Descripcion opcional de la zona"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Orden</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
              min={0}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[var(--color-ak-borgona)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 disabled:opacity-50 active:scale-[0.97] transition-transform duration-200"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Zona'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-input)] active:scale-[0.97] transition-transform duration-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
