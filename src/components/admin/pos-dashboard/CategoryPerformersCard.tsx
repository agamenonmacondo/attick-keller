'use client'

import { useState } from 'react'
import { CaretDown, CaretRight, Trophy, Warning } from '@phosphor-icons/react'
import { SectionHeading } from '../shared/SectionHeading'

interface PerformerProduct {
  productId: string
  productName: string
  quantity: number
  revenue: number
  cheques: number
}

interface CategoryPerformersCardProps {
  topPerformersByCat: Record<string, Array<PerformerProduct>>
  bottomPerformersByCat: Record<string, Array<PerformerProduct>>
  categoryNames: Record<string, string>
  categoryList: Array<{ id: string; name: string }>
  selectedCategory: string
  onCategoryClick: (id: string) => void
  onProductDrillDown?: (id: string, name: string) => void
}

function formatCOP(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `$${abs.toLocaleString('es-CO')}`
}

export function CategoryPerformersCard({
  topPerformersByCat,
  bottomPerformersByCat,
  categoryNames,
  categoryList,
  selectedCategory,
  onCategoryClick,
  onProductDrillDown,
}: CategoryPerformersCardProps) {
  // Categories that have performer data
  const categoriesWithPerformers = categoryList.filter(c => {
    const top = topPerformersByCat[c.id]
    const bottom = bottomPerformersByCat[c.id]
    return (top && top.length > 0) || (bottom && bottom.length > 0)
  })

  // Track expanded state: auto-expand selected category
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      return new Set([selectedCategory])
    }
    return new Set()
  })

  // When selectedCategory changes, auto-expand it
  const currentExpanded = new Set(expandedCats)
  if (selectedCategory && selectedCategory !== 'all' && categoriesWithPerformers.some(c => c.id === selectedCategory)) {
    currentExpanded.add(selectedCategory)
  }

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  if (categoriesWithPerformers.length === 0) {
    return null
  }

  return (
    <div>
      <SectionHeading>Mejores y Peores por Categoria</SectionHeading>
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-3">
        Top 2 y Bottom 2 productos por categoria
      </p>
      <div className="space-y-1.5">
        {categoriesWithPerformers.map(cat => {
          const isExpanded = currentExpanded.has(cat.id)
          const top2 = topPerformersByCat[cat.id] || []
          const bottom2 = bottomPerformersByCat[cat.id] || []

          return (
            <div key={cat.id} className="rounded-lg border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => toggleExpand(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-input)] transition-colors"
              >
                {isExpanded ? (
                  <CaretDown size={12} className="text-[var(--color-ak-borgona)] shrink-0" weight="bold" />
                ) : (
                  <CaretRight size={12} className="text-[var(--text-secondary)] shrink-0" weight="bold" />
                )}
                <span className="text-[10px] sm:text-[11px] font-medium text-[var(--text-primary)] truncate flex-1">
                  {cat.name}
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                  {top2.length > 0 ? formatCOP(top2[0].revenue) : ''}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 space-y-0.5">
                  {/* Top 2 performers — Oliva green */}
                  {top2.map((p, i) => (
                    <div
                      key={`top-${p.productId}`}
                      className={`flex items-center gap-2 py-1 px-2 rounded-sm cursor-pointer hover:bg-[#5C7A4D10] ${onProductDrillDown ? 'cursor-pointer' : ''}`}
                      onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                      title={onProductDrillDown ? `Ver detalle: ${p.productName}` : undefined}
                    >
                      <Trophy size={10} className="text-[#5C7A4D] shrink-0" weight="fill" />
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#5C7A4D] truncate flex-1">
                        #{i + 1} {p.productName}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-[#5C7A4D] shrink-0">
                        {formatCOP(p.revenue)}
                      </span>
                      <span className="text-[9px] text-[var(--text-secondary)] shrink-0 hidden sm:inline">
                        {p.quantity} uds
                      </span>
                    </div>
                  ))}

                  {/* Bottom 2 performers — Borgoña red */}
                  {bottom2.map((p, i) => (
                    <div
                      key={`bottom-${p.productId}`}
                      className={`flex items-center gap-2 py-1 px-2 rounded-sm cursor-pointer hover:bg-[#6B273710] ${onProductDrillDown ? 'cursor-pointer' : ''}`}
                      onClick={onProductDrillDown ? () => onProductDrillDown(p.productId, p.productName) : undefined}
                      title={onProductDrillDown ? `Ver detalle: ${p.productName}` : undefined}
                    >
                      <Warning size={10} className="text-[#6B2737] shrink-0" weight="fill" />
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#6B2737] truncate flex-1">
                        #{bottom2.length - i} {p.productName}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-[#6B2737] shrink-0">
                        {formatCOP(p.revenue)}
                      </span>
                      <span className="text-[9px] text-[var(--text-secondary)] shrink-0 hidden sm:inline">
                        {p.quantity} uds
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}