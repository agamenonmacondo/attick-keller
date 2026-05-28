'use client'

import { useState } from 'react'
import { Plus, Warning } from '@phosphor-icons/react'

interface AddStaffFormProps {
  onAdd: (email: string, role: string) => Promise<void>
}

export function AddStaffForm({ onAdd }: AddStaffFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('host')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await onAdd(email.trim(), role)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6">
      <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--text-primary)] mb-4">
        Agregar Personal
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
          className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
        >
          <option value="host">Host</option>
          <option value="store_admin">Administrador</option>
          <option value="super_admin">Super Admin</option>
          <option value="lider_area">Lider de Area</option>
          <option value="colaborador">Colaborador</option>
        </select>
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-ak-borgona)] text-[var(--bg-primary)] font-medium hover:bg-[var(--color-ak-borgona)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={18} />
          {submitting ? 'Agregando...' : 'Invitar'}
        </button>
      </form>
      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-danger)]">
          <Warning size={16} />
          {error}
        </p>
      )}
    </div>
  )
}