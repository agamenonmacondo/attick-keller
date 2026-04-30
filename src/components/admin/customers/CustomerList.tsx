'use client'

import { motion } from 'framer-motion'
import { User, CheckSquare, Square, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { TierBadge } from '../shared/TierBadge'
import { EmptyState } from '../shared/EmptyState'
import { Spinner, Users } from '@phosphor-icons/react'

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
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onPageChange: (page: number) => void
  onCustomerClick: (id: string) => void
  activeCustomerId: string | null
  onSelectAllFiltered?: () => void
  selectingAll?: boolean
}

export function CustomerList({
  customers, loading, error, page, total, totalPages,
  selectedIds, onToggleSelect, onSelectAll, onClearSelection,
  onPageChange, onCustomerClick, activeCustomerId,
  onSelectAllFiltered, selectingAll,
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
            className="flex items-center gap-1 text-[#8D6E63] hover:text-[#3E2723]"
          >
            {allSelected ? (
              <CheckSquare size={16} weight="fill" className="text-[#6B2737]" />
            ) : someSelected ? (
              <CheckSquare size={16} weight="fill" className="text-[#6B2737]/50" />
            ) : (
              <Square size={16} />
            )}
            {allSelected ? 'Deseleccionar pagina' : 'Seleccionar pagina'}
          </button>
          {onSelectAllFiltered && totalSelected < total && (
            <button
              type="button"
              onClick={onSelectAllFiltered}
              className="text-[#6B2737] font-medium hover:underline"
            >
              Seleccionar todos ({total})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalSelected > 0 && (
            <span className="text-[#6B2737] font-medium">
              {totalSelected} seleccionado{totalSelected !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[#BCAAA4]">{total} clientes</span>
        </div>
      </div>

      {isCrossPageSelection && (
        <div className="rounded-lg bg-[#6B2737]/5 border border-[#6B2737]/20 px-3 py-2 text-xs text-[#6B2737]">
          Has seleccionado {totalSelected} clientes en total (incluyendo otras paginas).
        </div>
      )}

      {selectingAll && (
        <div className="rounded-lg bg-[#EFEBE9] border border-[#D7CCC8] px-3 py-2 text-xs text-[#8D6E63] flex items-center gap-2">
          <Spinner size={14} className="animate-spin" />
          Seleccionando todos los clientes...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Error al cargar clientes: {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} className="animate-spin text-[#8D6E63]" />
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
              ? 'border-[#6B2737] bg-[#6B2737]/5'
              : selectedIds.has(c.id)
                ? 'border-[#6B2737]/50 bg-[#6B2737]/3'
                : 'border-[#D7CCC8] bg-white hover:border-[#BCAAA4]'
          )}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(c.id) }}
            className="shrink-0"
          >
            {selectedIds.has(c.id)
              ? <CheckSquare size={18} weight="fill" className="text-[#6B2737]" />
              : <Square size={18} className="text-[#BCAAA4] group-hover:text-[#8D6E63]" />
            }
          </button>

          <button
            type="button"
            onClick={() => onCustomerClick(c.id)}
            className="flex-1 text-left min-w-0"
          >
            <p className="truncate text-sm font-medium text-[#3E2723]">
              {c.full_name || 'Sin nombre'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8D6E63] mt-0.5">
              {c.phone && <span className="truncate">{c.phone}</span>}
              {c.phone && c.email && <span className="text-[#D7CCC8]">·</span>}
              {c.email && <span className="truncate">{c.email}</span>}
              {!c.phone && !c.email && <span>Sin contacto</span>}
            </div>
          </button>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <TierBadge tier={c.loyalty_tier} />
            <span className="text-[10px] text-[#8D6E63]">{c.total_visits}v</span>
          </div>
        </motion.div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#D7CCC8] text-[#8D6E63] hover:bg-[#EFEBE9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretLeft size={14} />
          </button>
          <span className="text-xs text-[#8D6E63]">
            {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#D7CCC8] text-[#8D6E63] hover:bg-[#EFEBE9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
