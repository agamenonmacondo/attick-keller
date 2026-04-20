'use client'

import { useState, useCallback } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'

interface CustomerNotesProps {
  customerId: string
  initialNotes: string | null
}

export function CustomerNotes({ customerId, initialNotes }: CustomerNotesProps) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveNotes = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }, [customerId, notes])

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas del equipo sobre este cliente..."
        rows={3}
        className="w-full rounded-lg border border-[#D7CCC8] bg-[#EFEBE9] px-3 py-2 text-sm text-[#3E2723] placeholder:text-[#BCAAA4] focus:border-[#6B2737] focus:outline-none resize-y"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={saveNotes}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B2737] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97] disabled:opacity-50"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <FloppyDisk size={14} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {saved && (
          <span className="text-xs text-[#5C7A4D]">Guardado</span>
        )}
      </div>
    </div>
  )
}