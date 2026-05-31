'use client'

import { Funnel, CaretDown, X, Calendar } from '@phosphor-icons/react'
import type { POSDashboardFilters } from '@/lib/hooks/usePOSDashboard'

interface POSFiltersBarProps {
  filters: POSDashboardFilters
  onChange: (filters: POSDashboardFilters) => void
  categoryList: Array<{ id: string; name: string }>
  zoneList?: Array<{ value: string; label: string }>
  availableMonths?: string[]
}

const DEFAULT_ZONES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todas las zonas' },
  { value: 'Tipi', label: 'Tipi' },
  { value: 'Attic', label: 'Attic' },
  { value: 'Chispas', label: 'Chispas' },
]

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

function monthToDates(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
  }
}

function datesToMonth(from?: string): string {
  if (!from) return ''
  return from.substring(0, 7) // 'YYYY-MM'
}

export function POSFiltersBar({ filters, onChange, categoryList, zoneList, availableMonths }: POSFiltersBarProps) {
  const zones = zoneList ?? DEFAULT_ZONES
  const hasActiveFilters = filters.zone !== 'all' || filters.category !== 'all'
  const currentMonth = datesToMonth(filters.from)

  const handleMonthChange = (month: string) => {
    if (month === 'all') {
      // Remove date filters = server auto-detects latest month
      onChange({ ...filters, from: undefined, to: undefined })
    } else {
      const { from, to } = monthToDates(month)
      onChange({ ...filters, from, to })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Funnel size={14} weight="regular" />
      </div>

      {/* Month selector */}
      {availableMonths && availableMonths.length > 1 && (
        <div className="relative">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Calendar size={11} className="text-[var(--text-secondary)]" />
          </div>
          <select
            value={currentMonth || 'all'}
            onChange={e => handleMonthChange(e.target.value)}
            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg pl-6 pr-7 py-1 text-[11px] sm:text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] min-w-[110px]"
          >
            {availableMonths.map(m => {
              const [y, mo] = m.split('-')
              return (
                <option key={m} value={m}>{`${MONTH_NAMES[mo] || mo} ${y}`}</option>
              )
            })}
          </select>
          <CaretDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
        </div>
      )}

      {/* Zone selector */}
      <div className="relative">
        <select
          value={filters.zone}
          onChange={e => onChange({ ...filters, zone: e.target.value })}
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 pr-7 text-[11px] sm:text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] min-w-[120px]"
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
          className="appearance-none bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-2.5 py-1 pr-7 text-[11px] sm:text-xs text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-ak-borgona)] min-w-[120px] max-w-[180px]"
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