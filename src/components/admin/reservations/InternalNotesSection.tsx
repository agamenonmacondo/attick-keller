'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { NotePencil, LockKey, PaperPlane, Trash } from '@phosphor-icons/react/dist/ssr'

interface ReservationNote {
  id: string
  reservation_id: string
  note: string
  author_name: string
  author_id: string | null
  created_at: string
}

interface InternalNotesSectionProps {
  reservationId: string | null
  internalNotes: string
  onNotesUpdate: (notes: string) => void
  className?: string
}

export function InternalNotesSection({ reservationId, internalNotes, onNotesUpdate, className }: InternalNotesSectionProps) {
  const [notes, setNotes] = useState<ReservationNote[]>([])
  const [loading, setLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    if (!reservationId || !showNotes) {
      setNotes([])
      return
    }
    setLoading(true)
    fetch(`/api/admin/reservation-notes?reservation_id=${reservationId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setNotes(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [reservationId, showNotes])

  const handleAddNote = async () => {
    if (!reservationId || !newNote.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/reservation-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          note: newNote.trim(),
          author_name: 'Admin',
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setNotes(prev => [...prev, saved])
        setNewNote('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/admin/reservation-notes?id=${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId))
      }
    } catch { /* ignore */ }
  }

  const handleSaveNotes = async () => {
    if (!reservationId) return
    try {
      await fetch(`/api/admin/reservations/${reservationId}/internal-notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: internalNotes }),
      })
      onNotesUpdate(internalNotes)
    } catch { /* ignore */ }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Internal notes field (stored on reservation row) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--color-ak-madera)] dark:text-white/70 flex items-center gap-1.5">
            <LockKey size={14} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
            Notas internas del equipo
          </label>
          <button
            onClick={handleSaveNotes}
            className="text-xs text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] hover:underline"
          >
            Guardar
          </button>
        </div>
        <textarea
          value={internalNotes}
          onChange={e => onNotesUpdate(e.target.value)}
          placeholder="Notas visibles solo para el equipo host..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-ak-madera)]/15 dark:border-white/10 bg-white/70 dark:bg-white/5 text-[var(--color-ak-madera)] dark:text-white placeholder:text-[var(--color-ak-madera)]/30 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] dark:focus:ring-[var(--color-ak-dorado)]"
        />
      </div>

      {/* Notes timeline (separate table) */}
      <div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] hover:underline"
        >
          <NotePencil size={14} />
          {showNotes ? 'Ocultar historial de notas' : `Ver historial de notas${notes.length > 0 ? ` (${notes.length})` : ''}`}
        </button>

        {showNotes && (
          <div className="mt-2 space-y-2">
            {loading ? (
              <div className="text-xs text-[var(--color-ak-madera)]/50 dark:text-white/40 py-2">
                Cargando notas...
              </div>
            ) : notes.length === 0 ? (
              <div className="text-xs text-[var(--color-ak-madera)]/50 dark:text-white/40 py-2">
                Sin notas del equipo
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-dorado)]/5 border border-[var(--color-ak-borgona)]/10 dark:border-[var(--color-ak-dorado)]/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]">
                        {note.author_name}
                      </span>
                      <span className="text-[10px] text-[var(--color-ak-madera)]/40 dark:text-white/25">
                        {new Date(note.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ak-madera)] dark:text-white/80 mt-0.5">{note.note}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-[var(--color-ak-madera)]/30 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                    title="Eliminar nota"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))
            )}

            {/* Add new note */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                placeholder="Agregar nota para el equipo..."
                className="flex-1 px-2 py-1 text-xs rounded border border-[var(--color-ak-madera)]/15 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--color-ak-madera)] dark:text-white"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                className="px-2 py-1 text-xs bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] text-white dark:text-[var(--color-ak-madera)] rounded disabled:opacity-40"
              >
                <PaperPlane size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}