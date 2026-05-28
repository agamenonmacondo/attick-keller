'use client'

import { useState, useEffect } from 'react'
import { Plus, Warning } from '@phosphor-icons/react'

interface StaffOption {
  id: string
  nombre_completo: string
  cargo: string | null
  area: string | null
}

interface AddStaffFormProps {
  onAdd: (data: { email: string; role: string; pos_nomina_staff_id?: string; area?: string }) => Promise<void>
}

export function AddStaffForm({ onAdd }: AddStaffFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('host')
  const [staffId, setStaffId] = useState('')
  const [area, setArea] = useState('')
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showEmployeeFields = role === 'lider_area' || role === 'colaborador'

  useEffect(() => {
    if (showEmployeeFields) {
      fetch('/api/admin/staff/list-employees')
        .then(res => res.ok ? res.json() : { employees: [] })
        .then(data => setStaffOptions(data.employees || []))
        .catch(() => setStaffOptions([]))
    }
  }, [showEmployeeFields])

  // Auto-fill area when staff is selected
  useEffect(() => {
    if (staffId) {
      const selected = staffOptions.find(s => s.id === staffId)
      if (selected?.area) {
        setArea(selected.area)
      }
    }
  }, [staffId, staffOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    if (showEmployeeFields && !staffId) {
      setError('Selecciona el empleado de nomina')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const payload: { email: string; role: string; pos_nomina_staff_id?: string; area?: string } = {
        email: email.trim(),
        role,
      }
      if (showEmployeeFields) {
        payload.pos_nomina_staff_id = staffId
        payload.area = area
      }
      await onAdd(payload)
      setEmail('')
      setStaffId('')
      setArea('')
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
            className="flex-1 min-h-[44px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
          />
          <select
            value={role}
            onChange={e => { setRole(e.target.value); setStaffId(''); setArea('') }}
            className="min-h-[44px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
          >
            <option value="host">Host</option>
            <option value="store_admin">Administrador</option>
            <option value="super_admin">Super Admin</option>
            <option value="lider_area">Lider de Area</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </div>

        {showEmployeeFields && (
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              className="flex-1 min-h-[44px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
            >
              <option value="">Seleccionar empleado...</option>
              {staffOptions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre_completo}{s.cargo ? ` — ${s.cargo}` : ''}{s.area ? ` (${s.area})` : ''}
                </option>
              ))}
            </select>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              className="min-h-[44px] px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
            >
              <option value="">Sin area</option>
              <option value="cocina">Cocina</option>
              <option value="barra">Barra</option>
              <option value="servicio">Servicio</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg bg-[var(--color-ak-borgona)] text-[var(--bg-primary)] font-medium hover:bg-[var(--color-ak-borgona)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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