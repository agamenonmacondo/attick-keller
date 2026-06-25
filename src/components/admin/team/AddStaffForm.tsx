'use client'

import { useState, useEffect } from 'react'
import { Plus, Warning } from '@phosphor-icons/react'

interface StaffMember {
  id: string
  nombre_completo: string
  area: string
  cargo: string
}

interface AddStaffFormProps {
  onAdd: (email: string, role: string, posNominaStaffId?: string, area?: string) => Promise<void>
}

export function AddStaffForm({ onAdd }: AddStaffFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('host')
  const [posNominaStaffId, setPosNominaStaffId] = useState('')
  const [staffOptions, setStaffOptions] = useState<StaffMember[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsEmployeeId = role === 'lider_area' || role === 'colaborador' || role === 'reservante'

  useEffect(() => {
    if (needsEmployeeId) {
      setLoadingStaff(true)
      fetch('/api/admin/pos-nomina-staff?activo=true')
        .then(res => res.ok ? res.json() : { staff: [] })
        .then(data => setStaffOptions(data.staff || []))
        .catch(() => setStaffOptions([]))
        .finally(() => setLoadingStaff(false))
    } else {
      setStaffOptions([])
      setPosNominaStaffId('')
    }
  }, [role, needsEmployeeId])

  const selectedStaff = staffOptions.find(s => s.id === posNominaStaffId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    if (needsEmployeeId && !posNominaStaffId) {
      setError('Selecciona un empleado de nomina para este rol')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onAdd(email.trim(), role, posNominaStaffId || undefined, selectedStaff?.area || undefined)
      setEmail('')
      setPosNominaStaffId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text-primary)] mb-4">
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
            <option value="reservante">Reservante</option>
          </select>
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-ak-borgona)] text-[var(--bg-primary)] font-medium hover:bg-[var(--color-ak-borgona)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={18} />
            {submitting ? 'Agregando...' : 'Invitar'}
          </button>
        </div>

        {needsEmployeeId && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Vincular a empleado de nomina
            </label>
            {loadingStaff ? (
              <div className="text-sm text-[var(--text-secondary)]">Cargando empleados...</div>
            ) : (
              <select
                value={posNominaStaffId}
                onChange={e => setPosNominaStaffId(e.target.value)}
                required={needsEmployeeId}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ak-borgona)]/30"
              >
                <option value="">-- Seleccionar empleado --</option>
                {staffOptions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_completo} — {s.area} ({s.cargo})
                  </option>
                ))}
              </select>
            )}
            {selectedStaff && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Area automatica: {selectedStaff.area}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-danger)]">
            <Warning size={16} />
            {error}
          </p>
        )}
      </form>
    </div>
  )
}