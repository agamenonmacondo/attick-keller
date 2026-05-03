'use client'

import { useState, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import type { Table, Zone } from '@/lib/types/inventory'

interface TableEditorProps {
  table?: Table
  zoneId?: string
  zones: Zone[]
  onClose: () => void
  onSave: () => void
}

export function TableEditor({ table, zoneId, zones, onClose, onSave }: TableEditorProps) {
  const isEditing = !!table
  const [number, setNumber] = useState(table?.number || '')
  const [capacity, setCapacity] = useState(table?.capacity ?? 2)
  const [capacityMin, setCapacityMin] = useState(table?.capacity_min ?? 2)
  const [nameAttick, setNameAttick] = useState(table?.name_attick || '')
  const [selectedZoneId, setSelectedZoneId] = useState(table?.zone_id || zoneId || '')
  const [canCombine, setCanCombine] = useState(table?.can_combine ?? false)
  const [combineGroup, setCombineGroup] = useState(table?.combine_group || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!number.trim()) { setError('Numero de mesa requerido'); return }
    if (capacity < 1) { setError('Capacidad debe ser mayor a 0'); return }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        number: number.trim(),
        capacity,
        capacity_min: Math.min(capacityMin, capacity),
        name_attick: nameAttick.trim() || null,
        zone_id: selectedZoneId || null,
        can_combine: canCombine,
        combine_group: canCombine && combineGroup.trim() ? combineGroup.trim() : null,
      }

      if (isEditing) {
        await fetch(`/api/admin/inventory/tables/${table.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/admin/inventory/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      onSave()
      onClose()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [table, number, capacity, capacityMin, nameAttick, selectedZoneId, canCombine, combineGroup, isEditing, onSave, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#F5EDE0] border border-[#D7CCC8] shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#3E2723]">
            {isEditing ? 'Editar Mesa' : 'Nueva Mesa'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8D6E63] hover:bg-[#D7CCC8]/50">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[#8D6E63]">Numero / Nomenclatura</label>
              <input
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                placeholder="Ej: 1A"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8D6E63]">Capacidad</label>
              <input
                type="number"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Capacidad minima</label>
            <input
              type="number"
              value={capacityMin}
              onChange={e => setCapacityMin(Number(e.target.value))}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              min={1}
              max={capacity}
            />
            <p className="mt-0.5 text-[9px] text-[#BCAAA4]">Minimo de personas requerido (se muestra si es diferente a la capacidad)</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Nombre atick (opcional)</label>
            <input
              type="text"
              value={nameAttick}
              onChange={e => setNameAttick(e.target.value)}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
              placeholder="Nombre para mostrar en el plano"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#8D6E63]">Zona</label>
            <select
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
              className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
            >
              <option value="">Sin zona</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={canCombine}
                onClick={() => setCanCombine(!canCombine)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out focus:outline-none ${
                  canCombine ? 'bg-[#6B2737]' : 'bg-[#D7CCC8]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition-transform duration-200 ease-out ${
                    canCombine ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs text-[#3E2723]">Combinable</span>
            </div>
          </div>
          {canCombine && (
            <div>
              <label className="mb-1 block text-xs text-[#8D6E63]">Grupo de combinacion</label>
              <input
                type="text"
                value={combineGroup}
                onChange={e => setCombineGroup(e.target.value)}
                className="w-full rounded-lg border border-[#D7CCC8] bg-white px-3 py-2 text-sm text-[#3E2723] focus:border-[#6B2737] focus:outline-none"
                placeholder="Ej: terraza-sur"
              />
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 disabled:opacity-50 active:scale-[0.97]"
              style={{ transition: 'transform 160ms ease-out' }}
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear Mesa'}
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
