'use client'

import { useState, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import type { Table, Combination } from '@/lib/types/inventory'

interface CombinationEditorProps {
  combination?: Combination
  tables: Table[]
  onClose: () => void
  onSave: () => void
}

export function CombinationEditor({ combination, tables, onClose, onSave }: CombinationEditorProps) {
  const isEditing = !!combination
  const combinableTables = tables.filter(t => t.can_combine)
  const [selectedIds, setSelectedIds] = useState<string[]>(combination?.table_ids || [])
  const [name, setName] = useState(combination?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTable = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const combinedCapacity = selectedIds.reduce((sum, id) => {
    const table = tables.find(t => t.id === id)
    return sum + (table?.capacity || 0)
  }, 0)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (selectedIds.length < 2) { setError('Selecciona al menos 2 mesas'); return }

    setSaving(true)
    try {
      if (isEditing) {
        await fetch('/api/admin/inventory/combinations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: combination.id,
            table_ids: selectedIds,
            name: name.trim() || null,
          }),
        })
      } else {
        await fetch('/api/admin/inventory/combinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_ids: selectedIds,
            name: name.trim() || undefined,
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
  }, [combination, selectedIds, name, isEditing, onSave, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#F5EDE0] border border-[#D7CCC8] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
            {isEditing ? 'Editar Combinacion' : 'Nueva Combinacion'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Nombre (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              placeholder="Ej: Terraza grande"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Mesas combinables ({selectedIds.length} seleccionadas)</label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-[#D7CCC8] bg-white p-2">
              {combinableTables.length === 0 ? (
                <p className="py-3 text-center text-xs text-[#BCAAA4]">No hay mesas combinables</p>
              ) : (
                combinableTables.map(table => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => toggleTable(table.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedIds.includes(table.id)
                        ? 'bg-[#6B2737] text-white'
                        : 'text-[#3E2723] hover:bg-[#EFEBE9]'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selectedIds.includes(table.id)
                        ? 'border-white bg-white/20'
                        : 'border-[#D7CCC8]'
                    }`}>
                      {selectedIds.includes(table.id) && (
                        <span className="text-[9px] font-bold">&#10003;</span>
                      )}
                    </span>
                    <span className="font-medium">{table.number}</span>
                    <span className="text-xs opacity-70">{table.capacity} pers.</span>
                    {table.zone?.name && (
                      <span className="ml-auto text-[10px] opacity-50">{table.zone.name}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedIds.length >= 2 && (
            <div className="rounded-lg border border-[#C9A94E]/30 bg-[#C9A94E]/5 px-3 py-2">
              <p className="text-xs text-[#8B7A3A]">
                Capacidad combinada: <strong>{combinedCapacity} personas</strong>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 disabled:opacity-50 active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out' }}
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Combinacion'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D7CCC8] px-4 py-2.5 text-sm font-medium text-[#3E2723] hover:bg-[#EFEBE9] active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
