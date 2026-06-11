'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import { NotePencil, PaperPlane, Trash, Check, Spinner, LockKey, ChatCircle, CaretDown, CaretUp } from '@phosphor-icons/react/dist/ssr'

interface ReservationNote {
  id: string
  reservation_id: string
  note: string
  author_name: string
  author_id: string | null
  created_at: string
}

interface NotesPanelProps {
  variant: 'admin' | 'host'
  reservationId: string | null
  internalNotes: string
  onNotesUpdate: (notes: string) => void
  className?: string
}

const VARIANT_CONFIG = {
  admin: {
    authorName: 'Admin',
    logTag: '[InternalNotes]',
  },
  host: {
    authorName: 'Host',
    logTag: '[HostNotes]',
  },
} as const

/**
 * Unified notes panel component with admin and host variants.
 * - admin: author_name 'Admin', madera colors, no card wrapper
 * - host: author_name 'Host', card wrapper with border, badge count
 */
export function NotesPanel({ variant, reservationId, internalNotes, onNotesUpdate, className }: NotesPanelProps) {
  const config = VARIANT_CONFIG[variant]
  const [notes, setNotes] = useState<ReservationNote[]>([])
  const [loading, setLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reservationId || !showNotes) {
      setNotes([])
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/admin/reservation-notes?reservation_id=${reservationId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(data => {
        setNotes(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(`${config.logTag} Failed to load notes:`, err)
        setError('Error al cargar notas')
        setLoading(false)
      })
  }, [reservationId, showNotes, config.logTag])

  const handleAddNote = useCallback(async () => {
    if (!reservationId || !newNote.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reservation-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: reservationId,
          note: newNote.trim(),
          author_name: config.authorName,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status}`)
      }
      const saved = await res.json()
      setNotes(prev => [...prev, saved])
      setNewNote('')
    } catch (err) {
      console.error(`${config.logTag} Failed to add note:`, err)
      setError(variant === 'admin' ? 'Error al guardar la nota. Intenta de nuevo.' : 'Error al guardar la nota')
    } finally {
      setSubmitting(false)
    }
  }, [reservationId, newNote, config.authorName, config.logTag, variant])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const res = await fetch(`/api/admin/reservation-notes?id=${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId))
      }
    } catch { /* ignore */ }
  }, [])

  const handleSaveInternalNotes = useCallback(async () => {
    if (!reservationId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/internal-notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: internalNotes, author_name: config.authorName }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status}`)
      }
      onNotesUpdate(internalNotes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(`${config.logTag} Failed to save internal notes:`, err)
      setError(variant === 'admin' ? 'Error al guardar. Intenta de nuevo.' : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [reservationId, internalNotes, onNotesUpdate, config.logTag, variant])

  // ─── Admin variant ──────────────────────────────────────────────
  if (variant === 'admin') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 text-xs text-[var(--color-danger)]">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Internal notes field (stored on reservation row) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--color-ak-madera)] dark:text-white/70 flex items-center gap-1.5">
              <LockKey size={14} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
              Notas internas del equipo
            </label>
            <button
              type="button"
              onClick={handleSaveInternalNotes}
              disabled={saving}
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded transition-colors',
                saved
                  ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                  : 'text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] hover:bg-[var(--color-ak-borgona)]/10 dark:hover:bg-[var(--color-ak-dorado)]/10',
                saving && 'opacity-50 cursor-wait',
              )}
            >
              {saving ? (
                <Spinner size={12} className="animate-spin" />
              ) : saved ? (
                <Check size={12} weight="bold" />
              ) : null}
              {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <textarea
            value={internalNotes}
            onChange={e => { onNotesUpdate(e.target.value); setSaved(false) }}
            placeholder="Notas visibles solo para el equipo host..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-ak-madera)]/15 dark:border-[var(--border-light)]/10 bg-[var(--bg-card)]/70 dark:bg-[var(--bg-card)]/5 text-[var(--color-ak-madera)] dark:text-white placeholder:text-[var(--color-ak-madera)]/30 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] dark:focus:ring-[var(--color-ak-dorado)]"
          />
        </div>

        {/* Notes timeline (separate table) */}
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] hover:underline"
          >
            <NotePencil size={14} />
            {showNotes ? 'Ocultar historial de notas' : `Ver historial de notas${notes.length > 0 ? ` (${notes.length})` : ''}`}
          </button>

          {showNotes && (
            <div className="mt-2 space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-ak-madera)]/50 dark:text-white/40 py-2">
                  <Spinner size={14} className="animate-spin" />
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
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-[var(--color-ak-madera)]/30 dark:text-white/20 hover:text-[var(--color-danger)] flex-shrink-0"
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
                  onChange={e => { setNewNote(e.target.value); setError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                  placeholder="Agregar nota para el equipo..."
                  className="flex-1 px-2 py-1 text-xs rounded border border-[var(--color-ak-madera)]/15 dark:border-[var(--border-light)]/10 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 text-[var(--color-ak-madera)] dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || submitting}
                  className={cn(
                    'px-2 py-1 text-xs rounded flex items-center justify-center transition-colors',
                    'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] text-white dark:text-[var(--color-ak-madera)]',
                    (!newNote.trim() || submitting) && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {submitting ? <Spinner size={12} className="animate-spin" /> : <PaperPlane size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Host variant ───────────────────────────────────────────────
  const hasNotes = internalNotes.trim().length > 0 || notes.length > 0

  return (
    <div className={cn('rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden', className)}>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          {error}
          <button type="button" onClick={() => setError(null)} className="underline ml-2">Cerrar</button>
        </div>
      )}

      {/* Section 1: Internal notes (quick textarea) */}
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <LockKey size={16} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Notas del equipo
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveInternalNotes}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              saved
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-dorado)] dark:text-[var(--color-ak-madera)] shadow-sm',
              saving && 'opacity-50 cursor-wait',
            )}
          >
            {saving ? <Spinner size={14} className="animate-spin" /> : saved ? <Check size={14} weight="bold" /> : null}
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        <textarea
          value={internalNotes}
          onChange={e => { onNotesUpdate(e.target.value); setSaved(false) }}
          placeholder="Notas visibles solo para el equipo..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30 dark:focus:ring-[var(--color-ak-dorado)]/30 resize-none"
        />
      </div>

      {/* Section 2: Notes history (threaded) */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-1.5">
            <ChatCircle size={16} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Historial de notas
            </span>
            {notes.length > 0 && !showNotes && (
              <span className="bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-dorado)] text-white dark:text-[var(--color-ak-madera)] text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {notes.length}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)] flex items-center gap-0.5">
            {showNotes ? 'Ocultar' : 'Ver notas'}
            {showNotes ? <CaretUp size={10} /> : <CaretDown size={10} />}
          </span>
        </button>

        {showNotes && (
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-4 h-4 border-2 border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[var(--text-secondary)]">Cargando notas...</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-xs text-[var(--text-secondary)] py-2 text-center">
                Sin notas del equipo
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)]"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-ak-borgona)]/10 dark:bg-[var(--color-ak-dorado)]/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-dorado)]">
                      {note.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{note.author_name}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(note.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)] mt-0.5 break-words">{note.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-[var(--text-secondary)] hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 p-1"
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
                onChange={e => { setNewNote(e.target.value); setError(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                placeholder="Agregar nota..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30 dark:focus:ring-[var(--color-ak-borgona-light)]/30"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                className={cn(
                  'px-3 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm',
                  'bg-[var(--color-ak-borgona)] text-white dark:bg-[var(--color-ak-dorado)] dark:text-[var(--color-ak-madera)]',
                  (!newNote.trim() || submitting) && 'opacity-40 cursor-not-allowed',
                )}
              >
                {submitting ? <Spinner size={16} className="animate-spin" /> : <PaperPlane size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}