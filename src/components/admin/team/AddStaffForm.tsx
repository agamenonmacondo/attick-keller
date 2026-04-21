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
    <div className="bg-white rounded-xl border border-[#D7CCC8] p-6">
      <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#3E2723] mb-4">
        Agregar Personal
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
          className="flex-1 px-4 py-2.5 rounded-lg border border-[#D7CCC8] bg-[#F5EDE0] text-[#3E2723] placeholder:text-[#8D6E63] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/30"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-[#D7CCC8] bg-[#F5EDE0] text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#6B2737]/30"
        >
          <option value="host">Host</option>
          <option value="store_admin">Administrador</option>
        </select>
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#6B2737] text-white font-medium hover:bg-[#5C2230] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={18} />
          {submitting ? 'Agregando...' : 'Invitar'}
        </button>
      </form>
      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <Warning size={16} />
          {error}
        </p>
      )}
    </div>
  )
}