'use client'

import { motion } from 'framer-motion'
import { User, CheckSquare, Square } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { TierBadge } from '../shared/TierBadge'
import { EmptyState } from '../shared/EmptyState'
import { Spinner, Users } from '@phosphor-icons/react'
import { Pagination } from './Pagination'

interface Customer {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  total_visits: number
  last_visit_date: string | null
  loyalty_tier: string
  tag_ids: string[]
}

interface CustomerListProps {
  customers: Customer[]
  loading: boolean
  error: string | null
  page: number
  total: number
  totalPages: number
  perPage: number
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onPageChange: (page: number) => void
  onCustomerClick: (id: string) => void
  activeCustomerId: string | null
  onSelectAllFiltered?: () => void
  selectingAll?: boolean
  onPerPageChange?: (n: number) => void
}

export function CustomerList({
  customers, loading, error, page, total, totalPages, perPage,
  selectedIds, onToggleSelect, onSelectAll, onClearSelection,
  onPageChange, onCustomerClick, activeCustomerId,
  onSelectAllFiltered, selectingAll, onPerPageChange,
}: CustomerListProps) {
  const allSelected = customers.length > 0 && customers.every(c => selectedIds.has(c.id))
  const someSelected = customers.some(c => selectedIds.has(c.id))
  const totalSelected = selectedIds.size
  const isCrossPageSelection = totalSelected > customers.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {allSelected ? (
              <CheckSquare size={16} weight="fill" className="text-[var(--color-ak-borgona)]" />
            ) : someSelected ? (
              <CheckSquare size={16} weight="fill" className="text-[var(--color-ak-borgona)]/50" />
            ) : (
              <Square size={16} />
            )}
            {allSelected ? 'Deseleccionar pagina' : 'Seleccionar pagina'}
          </button>
          {onSelectAllFiltered && totalSelected < total && (
            <button
              type="button"
              onClick={onSelectAllFiltered}
              className="text-[var(--color-ak-borgona)] font-medium hover:underline"
            >
              Seleccionar todos ({total})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalSelected > 0 && (
            <span className="text-[var(--color-ak-borgona)] font-medium">
              {totalSelected} seleccionado{totalSelected !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[#BCAAA4]">{total} clientes</span>
        </div>
      </div>

      {isCrossPageSelection && (
        <div className="rounded-lg bg-[var(--color-ak-borgona)]/5 border border-[#6B2737]/20 px-3 py-2 text-xs text-[var(--color-ak-borgona)]">
          Has seleccionado {totalSelected} clientes en total (incluyendo otras paginas).
        </div>
      )}

      {selectingAll && (
        <div className="rounded-lg bg-[#EFEBE9] border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)] flex items-center gap-2">
          <Spinner size={14} className="animate-spin" />
          Seleccionando todos los clientes...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-[var(--color-danger)]/10 border border-red-200 px-4 py-3 text-sm text-[var(--color-danger)]">
          Error al cargar clientes: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <EmptyState
          icon={<User size={32} />}
          title="Sin resultados"
          description="Ajusta los filtros o crea clientes nuevos"
        />
      )}

      {!loading && customers.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 cursor-pointer group transition-colors duration-200',
            activeCustomerId === c.id
              ? 'border-[#6B2737] bg-[var(--color-ak-borgona)]/5'
              : selectedIds.has(c.id)
                ? 'border-[#6B2737]/50 bg-[var(--color-ak-borgona)]/3'
                : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[#BCAAA4]'
          )}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(c.id) }}
            className="shrink-0"
          >
            {selectedIds.has(c.id)
              ? <CheckSquare size={18} weight="fill" className="text-[var(--color-ak-borgona)]" />
              : <Square size={18} className="text-[#BCAAA4] group-hover:text-[var(--text-secondary)]" />
            }
          </button>

          <button
            type="button"
            onClick={() => onCustomerClick(c.id)}
            className="flex-1 text-left min-w-0"
          >
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {c.full_name || 'Sin nombre'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] mt-0.5">
              {c.phone && <span className="truncate">{c.phone}</span>}
              {c.phone && c.email && <span className="text-[#D7CCC8]">·</span>}
              {c.email && <span className="truncate">{c.email}</span>}
              {!c.phone && !c.email && <span>Sin contacto</span>}
            </div>
          </button>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <TierBadge tier={c.loyalty_tier} />
            <span className="text-[10px] text-[var(--text-secondary)]">{c.total_visits}v</span>
          </div>
        </motion.div>
      ))}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange || ((n: number) => {})}
        />
      )}
    </div>
  )
}
