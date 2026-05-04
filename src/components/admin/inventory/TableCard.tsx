'use client'

import { PencilSimple } from '@phosphor-icons/react'
import type { Table } from '@/lib/types/inventory'

interface TableCardProps {
  table: Table
  onToggle: (id: string, active: boolean) => void
  onEdit: (table: Table) => void
}

export function TableCard({ table, onToggle, onEdit }: TableCardProps) {
  const capacityLabel = table.capacity_min && table.capacity_min !== table.capacity
    ? `${table.capacity_min}-${table.capacity} personas`
    : `${table.capacity} personas`

  return (
    <div className={`rounded-lg border p-3 ${table.is_active ? 'border-[#D7CCC8] bg-white' : 'border-red-100 bg-red-50/30'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {table.name_attick ? (
            <>
              <span className="text-base font-semibold text-[#3E2723]">{table.name_attick}</span>
              <span className="text-xs text-[#8D6E63]">({table.number})</span>
            </>
          ) : (
            <span className="text-base font-semibold text-[#3E2723]">{table.number}</span>
          )}
          {table.zone?.name && (
            <span className="text-[10px] text-[#8D6E63] bg-[#EFEBE9] rounded-full px-2 py-0.5">{table.zone.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${
            table.is_active ? 'bg-green-50 text-[#5C7A4D]' : 'bg-red-50 text-red-500'
          }`}>
            {table.is_active ? 'Activa' : 'Inactiva'}
          </span>
          <button
            type="button"
            onClick={() => onEdit(table)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#8D6E63] hover:bg-[#D7CCC8]/50"
            title="Editar mesa"
          >
            <PencilSimple size={14} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-2 text-xs text-[#8D6E63] mb-2">
        <span>{capacityLabel}</span>
      </div>

      {/* Badges + toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {table.can_combine && (
            <span className="rounded-full bg-[#6B2737]/5 px-2 py-0.5 text-[9px] font-medium text-[#6B2737]">
              Combinable
            </span>
          )}
          {table.combine_group && (
            <span className="rounded-full bg-[#C9A94E]/10 px-2 py-0.5 text-[9px] font-medium text-[#8B7A3A]">
              Grupo {table.combine_group}
            </span>
          )}
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={table.is_active}
          onClick={() => onToggle(table.id, !table.is_active)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out focus:outline-none ${
            table.is_active ? 'bg-[#5C7A4D]' : 'bg-[#D7CCC8]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition-transform duration-200 ease-out ${
              table.is_active ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
