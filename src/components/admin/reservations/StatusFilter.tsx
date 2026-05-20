'use client'

import { cn } from '@/lib/utils/cn'

interface StatusFilterProps {
  active: string
  onChange: (status: string) => void
  counts: Record<string, number>
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'seated', label: 'Sentados' },
  { key: 'cancelled', label: 'Canceladas' },
]

export function StatusFilter({ active, onChange, counts }: StatusFilterProps) {
  return (
    <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-[var(--border-default)]">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium',
            active === f.key
              ? 'border-[var(--color-ak-borgona)] text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
          style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
        >
          {f.label}
          {counts[f.key] !== undefined && (
            <span className="ml-1.5 text-xs text-[var(--text-muted)]">{counts[f.key]}</span>
          )}
        </button>
      ))}
    </div>
  )
}