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
      <div className="bg-white rounded-xl border border-[#D7CCC8] p-8 text-center text-[#8D6E63]">
        No hay personal asignado. Agrega un miembro del equipo arriba.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#D7CCC8] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#D7CCC8]">
        <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#3E2723]">
          Equipo ({staff.length})
        </h2>
      </div>
      <div className="divide-y divide-[#D7CCC8]">
        {staff.map(member => (
          <div key={member.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-[#EFEBE9] flex items-center justify-center text-[#5D4037] font-bold text-sm">
                {(member.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[#3E2723]">{member.email || 'Sin email'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    member.role === 'super_admin' ? 'bg-[#6B2737]/10 text-[#6B2737]' :
                    member.role === 'store_admin' ? 'bg-[#D4922A]/15 text-[#D4922A]' :
                    'bg-[#5C7A4D]/10 text-[#5C7A4D]'
                  }`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  {!member.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
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
                  member.is_active ? 'text-[#5C7A4D] hover:bg-[#5C7A4D]/10' : 'text-[#8D6E63] hover:bg-[#8D6E63]/10'
                }`}
                title={member.is_active ? 'Desactivar' : 'Activar'}
              >
                {member.is_active ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
              </button>
              {confirmDeleteId === member.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700">Confirmar?</span>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors"
                  >
                    Si, eliminar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#EFEBE9] text-[#3E2723] hover:bg-[#D7CCC8] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(member.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
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