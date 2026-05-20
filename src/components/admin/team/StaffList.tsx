'use client'

import { useState } from 'react'
import { ToggleLeft, ToggleRight, Trash, Warning } from '@phosphor-icons/react'

interface StaffMember {
  id: string
  auth_user_id: string
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface StaffListProps {
  staff: StaffMember[]
  onToggleActive: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const ROLE_LABELS: Record<string, string> = {
  host: 'Host',
  store_admin: 'Administrador',
  super_admin: 'Super Admin',
}

export function StaffList({ staff, onToggleActive, onDelete }: StaffListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    await onDelete(id)
    setConfirmDeleteId(null)
  }

  if (staff.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-8 text-center text-[var(--text-secondary)]">
        No hay personal asignado. Agrega un miembro del equipo arriba.
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-default)]">
        <h2 className="font-['Playfair_Display'] text-xl font-bold text-[var(--text-primary)]">
          Equipo ({staff.length})
        </h2>
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {staff.map(member => (
          <div key={member.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm">
                {(member.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{member.email || 'Sin email'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    member.role === 'super_admin' ? 'bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)]' :
                    member.role === 'store_admin' ? 'bg-[var(--color-ak-ambar)]/15 text-[var(--color-ak-ambar)]' :
                    'bg-[var(--color-ak-oliva)]/10 text-[var(--color-ak-oliva)]'
                  }`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  {!member.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] font-medium">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleActive(member.id, !member.is_active)}
                className={`p-2 rounded-lg transition-colors ${
                  member.is_active ? 'text-[var(--color-ak-oliva)] hover:bg-[var(--color-ak-oliva)]/10' : 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/10'
                }`}
                title={member.is_active ? 'Desactivar' : 'Activar'}
              >
                {member.is_active ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
              </button>
              {confirmDeleteId === member.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-danger)]">Confirmar?</span>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors"
                  >
                    Si, eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--border-default)] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(member.id)}
                  className="p-2 rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                  title="Eliminar rol"
                >
                  <Trash size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}