'use client'

import { Funnel, CaretDown } from '@phosphor-icons/react'
import type { POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'

interface POSFiltersBarProps {
  filters: POSDashboardFilters
  onChange: (filters: POSDashboardFilters) => void
  categoryList: Array<{ id: string; name: string }>
}

const ZONES = [
  { value: 'all', label: 'Todas las zonas' },
  { value: 'Tipi', label: 'Tipi' },
  { value: 'Attic', label: 'Attic' },
  { value: 'Chispas', label: 'Chispas' },
]

export function POSFiltersBar({ filters, onChange, categoryList }: POSFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Funnel size={16} weight="regular" />
        <span className="font-medium">Filtros</span>
      </div>

      {/* Zone selector */}
      <div className="relative">
        <select
          value={filters.zone}
          onChange={e => onChange({ ...filters, zone: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 pr-8 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)]"
        >
          {ZONES.map(z => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
        <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Category selector */}
      <div className="relative">
        <select
          value={filters.category}
          onChange={e => onChange({ ...filters, category: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 pr-8 text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] max-w-[200px]"
        >
          <option value="all">Todas las categorias</option>
          {categoryList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <CaretDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
      </div>

      {/* Active filters clear */}
      {(filters.zone !== 'all' || filters.category !== 'all') && (
        <button
          onClick={() => onChange({ ...filters, zone: 'all', category: 'all' })}
          className="text-[10px] text-[var(--color-ak-borgona)] hover:underline font-medium"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}