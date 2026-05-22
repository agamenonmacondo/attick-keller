'use client'

import { Funnel, CaretDown, X } from '@phosphor-icons/react'
import type { POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'

interface POSFiltersBarProps {
  filters: POSDashboardFilters
  onChange: (filters: POSDashboardFilters) => void
  categoryList: Array<{ id: string; name: string }>
  zoneList?: Array<{ value: string; label: string }>
}

const DEFAULT_ZONES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas las zonas' },
  { value: 'Tipi', label: 'Tipi' },
  { value: 'Attic', label: 'Attic' },
  { value: 'Chispas', label: 'Chispas' },
]

export function POSFiltersBar({ filters, onChange, categoryList, zoneList }: POSFiltersBarProps) {
  const zones = zoneList ?? DEFAULT_ZONES
  const hasActiveFilters = filters.zone !== 'all' || filters.category !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Funnel size={14} weight="regular" />
      </div>

      {/* Zone selector */}
      <div className="relative">
        <select
          value={filters.zone}
          onChange={e => onChange({ ...filters, zone: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 pr-7 text-[11px] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
        >
          {zones.map(z => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
        <CaretDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Category selector */}
      <div className="relative">
        <select
          value={filters.category}
          onChange={e => onChange({ ...filters, category: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 pr-7 text-[11px] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] max-w-[180px]"
        >
          <option value="all">Todas las categorias</option>
          {categoryList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <CaretDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange({ ...filters, zone: 'all', category: 'all' })}
          className="flex items-center gap-0.5 text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
        >
          <X size={10} />
          Limpiar
        </button>
      )}
    </div>
  )
}