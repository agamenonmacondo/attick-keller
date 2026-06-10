'use client'

import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'
import { formatCOPFull } from '@/lib/utils/formatCurrency'
import type { ProductCostItem } from '@/lib/hooks/useProductCostCatalog'

interface ProductRecipeDetailProps {
  product: ProductCostItem | null
  onClose: () => void
}

export default function ProductRecipeDetail({ product, onClose }: ProductRecipeDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!product) return null

  const { productName, categoryName, salePrice, recipeCost, margin, marginPct, ingredients } = product
  const marginColor = marginPct === null
    ? 'text-[var(--text-secondary)]'
    : marginPct < 30
      ? 'text-[var(--color-danger)]'
      : marginPct < 50
        ? 'text-yellow-400'
        : 'text-[var(--color-success)]'

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full z-50 w-full sm:w-[520px] lg:w-[600px] bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-2xl overflow-y-auto animate-slide-in-right"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border-default)] px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
              Catalogo / Producto
            </p>
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{productName}</h3>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-md hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-[var(--border-default)]">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Precio Venta</p>
            <p className="text-sm font-bold tabular-nums mt-1">{formatCOPFull(salePrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Costo Receta</p>
            <p className="text-sm font-bold tabular-nums mt-1">{formatCOPFull(recipeCost)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Margen</p>
            <p className={`text-sm font-bold tabular-nums mt-1 ${marginColor}`}>
              {formatCOPFull(margin)}
              <span className="text-[10px] ml-1">({marginPct !== null ? `${marginPct.toFixed(1)}%` : '—'})</span>
            </p>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px] text-[var(--text-secondary)] border-b border-[var(--border-default)]">
          <span>Categoria: <strong className="text-[var(--text-primary)]">{categoryName}</strong></span>
          <span>Insumos: <strong className="text-[var(--text-primary)]">{ingredients.length}</strong></span>
        </div>

        {/* Ingredients table */}
        <div className="p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Desglose de Insumos
          </h4>
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-[10px] sm:text-xs min-w-[450px]">
              <thead className="bg-[var(--bg-input)] text-[var(--text-secondary)] uppercase tracking-wider text-[9px] sticky top-0">
                <tr>
                  <th className="py-2 px-2 text-left">Insumo</th>
                  <th className="py-2 px-2 text-left">Categoria</th>
                  <th className="py-2 px-2 text-right">Cant</th>
                  <th className="py-2 px-2 text-left">Und</th>
                  <th className="py-2 px-2 text-right">Costo/u</th>
                  <th className="py-2 px-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => (
                  <tr key={ing.ingredientId} className="border-t border-[var(--border-default)] hover:bg-[var(--bg-input)]">
                    <td className="py-1.5 px-2 max-w-[140px] truncate font-medium">{ing.ingredientName}</td>
                    <td className="py-1.5 px-2 text-[var(--text-secondary)]">{ing.categoryName}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{ing.quantity % 1 === 0 ? ing.quantity : ing.quantity.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-[var(--text-secondary)]">{ing.unit}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatCOPFull(ing.unitCost)}/u</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-medium">{formatCOPFull(ing.totalCost)}</td>
                  </tr>
                ))}
                {ingredients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[var(--text-secondary)]">
                      Sin datos de insumos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between mt-3 px-2 py-2 rounded-md bg-[var(--bg-input)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Receta</span>
            <span className="text-sm font-bold tabular-nums">{formatCOPFull(recipeCost)}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}