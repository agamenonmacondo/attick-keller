'use client'

import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (n: number) => void
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('ellipsis')
  }

  pages.push(total)

  return pages
}

const PER_PAGE_OPTIONS = [25, 50, 100]

export function Pagination({
  page, totalPages, total, perPage,
  onPageChange, onPerPageChange,
}: PaginationProps) {
  const [gotoInput, setGotoInput] = useState('')

  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const handleGoto = () => {
    const p = parseInt(gotoInput, 10)
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p)
      setGotoInput('')
    }
  }

  if (totalPages <= 1 && total <= perPage) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      {/* Per page selector */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>Mostrar</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(parseInt(e.target.value, 10))}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--color-ak-borgona)] focus:outline-none"
        >
          {PER_PAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span>por pagina</span>
      </div>

      {/* Info text */}
      <span className="text-xs text-[var(--text-secondary)]">
        Mostrando {from}-{to} de {total.toLocaleString()} clientes
      </span>

      {/* Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretLeft size={12} />
          </button>

          {pageNumbers.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e-${i}`} className="px-1 text-xs text-[var(--text-muted)]">...</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-lg text-xs font-medium transition-colors',
                  p === page
                    ? 'bg-[var(--color-ak-borgona)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)] border border-transparent'
                )}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretRight size={12} />
          </button>

          {totalPages > 10 && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-[var(--text-secondary)]">Ir a pagina</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={gotoInput}
                onChange={(e) => setGotoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoto()}
                className="w-12 rounded-lg border border-[var(--border-default)] px-1.5 py-1 text-xs text-[var(--text-primary)] text-center focus:border-[var(--color-ak-borgona)] focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
