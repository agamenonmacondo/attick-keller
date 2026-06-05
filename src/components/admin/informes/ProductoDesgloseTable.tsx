'use client'

import { useState, useMemo } from 'react'
import { Download, Clock, Calendar, Spinner, Warning, Package, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import { buildHourlyMatrix, buildDailyMatrix, type ProductoHoraItem } from '@/lib/hooks/useProductoHourly'
import { SectionHeading } from '../shared/SectionHeading'

type ViewMode = 'hour' | 'day'
type ValueMode = 'revenue' | 'quantity'

const fmt = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number): string => Math.round(n).toLocaleString('es-CO')

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

interface ProductoDesgloseTableProps {
  data: ProductoHoraItem[]
  loading: boolean
  error: string | null
  from: string
  to: string
}

export function ProductoDesgloseTable({ data, loading, error, from, to }: ProductoDesgloseTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('hour')
  const [valueMode, setValueMode] = useState<ValueMode>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // ── Helpers — MUST be before useMemo (TDZ-safe) ──
  const getTotal = (rowMap: Map<string | number, { qty: number; revenue: number }> | undefined): number => {
    if (!rowMap) return 0
    let sum = 0
    for (const [, val] of rowMap) {
      sum += valueMode === 'revenue' ? val.revenue : val.qty
    }
    return sum
  }

  const getCellValue = (product: string, col: string | number): number => {
    const cell = matrix.get(product)?.get(col)
    if (!cell) return 0
    return valueMode === 'revenue' ? cell.revenue : cell.qty
  }

  const formatCell = (val: number): string => {
    return valueMode === 'revenue' ? fmt(val) : fmtN(val)
  }

  // Build matrix based on view mode
  const { products, columns, matrix, colHeaders } = useMemo(() => {
    if (!data || data.length === 0) return { products: [] as string[], columns: [] as string[], matrix: new Map<string, Map<string | number, { qty: number; revenue: number }>>(), colHeaders: [] as string[] }

    if (viewMode === 'hour') {
      const { products: p, hours, matrix: m } = buildHourlyMatrix(data)
      const sorted = [...p].sort((a, b) => {
        const totalA = getTotal(m.get(a)!)
        const totalB = getTotal(m.get(b)!)
        return sortOrder === 'desc' ? totalB - totalA : totalA - totalB
      })
      return {
        products: sorted,
        columns: hours.map(String),
        matrix: m as Map<string, Map<string | number, { qty: number; revenue: number }>>,
        colHeaders: hours.map(formatHourLabel),
      }
    } else {
      const { products: p, days, matrix: m } = buildDailyMatrix(data)
      const sorted = [...p].sort((a, b) => {
        const totalA = getTotal(m.get(a)!)
        const totalB = getTotal(m.get(b)!)
        return sortOrder === 'desc' ? totalB - totalA : totalA - totalB
      })
      return {
        products: sorted,
        columns: days,
        matrix: m as Map<string, Map<string | number, { qty: number; revenue: number }>>,
        colHeaders: days.map(formatDayLabel),
      }
    }
  }, [data, viewMode, sortOrder])

  // Grand total per column
  const columnTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const col of columns) {
      let sum = 0
      for (const product of products) {
        const cell = matrix.get(product)?.get(col)
        if (cell) sum += valueMode === 'revenue' ? cell.revenue : cell.qty
      }
      totals.set(col, sum)
    }
    return totals
  }, [columns, products, matrix, valueMode])

  // Export CSV
  const handleExportCSV = () => {
    const valueLabel = valueMode === 'revenue' ? 'Revenue' : 'Cantidad'
    const dimensionLabel = viewMode === 'hour' ? 'Hora' : 'Dia'

    // Header
    let csv = `Producto\\${dimensionLabel}`
    for (const col of columns) {
      csv += `,${col}`
    }
    csv += ',Total\n'

    // Rows
    for (const product of products) {
      csv += `"${product}"`
      let rowTotal = 0
      for (const col of columns) {
        const cell = matrix.get(product)?.get(col)
        const val = cell ? (valueMode === 'revenue' ? cell.revenue : cell.qty) : 0
        rowTotal += val
        csv += `,${val}`
      }
      csv += `,${rowTotal}\n`
    }

    // Totals row
    csv += 'TOTAL'
    let grandTotal = 0
    for (const col of columns) {
      const t = columnTotals.get(col) || 0
      grandTotal += t
      csv += `,${t}`
    }
    csv += `,${grandTotal}\n`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Ventas-Producto-${viewMode}-${from}-${to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Loading
  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" style={{ minHeight: 200 }}>
        <SectionHeading>Desglose de Ventas por Producto</SectionHeading>
        <div className="flex items-center justify-center py-12 gap-3">
          <Spinner size={24} className="animate-spin" style={{ color: 'var(--color-ak-borgona)' }} />
          <span className="text-sm text-[var(--text-secondary)]">Cargando desglose...</span>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" style={{ minHeight: 200 }}>
        <SectionHeading>Desglose de Ventas por Producto</SectionHeading>
        <div className="flex items-center gap-2 p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-danger)' }}>
          <Warning size={16} style={{ color: 'var(--color-danger)' }} />
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</span>
        </div>
      </div>
    )
  }

  // Empty
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" style={{ minHeight: 200 }}>
        <SectionHeading>Desglose de Ventas por Producto</SectionHeading>
        <div className="text-center py-8">
          <Package size={32} className="mx-auto opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Selecciona un periodo para ver el desglose</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl" style={{ minHeight: 200 }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading>Desglose de Ventas por Producto</SectionHeading>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[var(--border-default)]">
              <button
                onClick={() => setViewMode('hour')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors"
                style={viewMode === 'hour'
                  ? { background: 'var(--color-ak-borgona)', color: '#fff' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                }
              >
                <Clock size={12} /> Por Hora
              </button>
              <button
                onClick={() => setViewMode('day')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors"
                style={viewMode === 'day'
                  ? { background: 'var(--color-ak-borgona)', color: '#fff' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                }
              >
                <Calendar size={12} /> Por Dia
              </button>
            </div>
            {/* Value toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[var(--border-default)]">
              <button
                onClick={() => setValueMode('revenue')}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={valueMode === 'revenue'
                  ? { background: 'var(--color-ak-dorado)', color: 'var(--color-ak-madera)' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                }
              >
                $
              </button>
              <button
                onClick={() => setValueMode('quantity')}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={valueMode === 'quantity'
                  ? { background: 'var(--color-ak-dorado)', color: 'var(--color-ak-madera)' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                }
              >
                #
              </button>
            </div>
            {/* Sort order */}
            <button
              onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
              {sortOrder === 'desc' ? 'Mayor' : 'Menor'}
            </button>
            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={{
                background: 'var(--color-ak-borgona)',
                color: 'var(--color-ak-dorado)',
              }}
            >
              <Download size={14} weight="fill" /> CSV
            </button>
          </div>
        </div>
        {/* Info line */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{products.length} productos</span>
          <span>·</span>
          <span>{viewMode === 'hour' ? '24 horas' : `${columns.length} dias`}</span>
          <span>·</span>
          <span>{valueMode === 'revenue' ? 'Revenue' : 'Unidades'}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 600, overflowY: 'auto' }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)' }}>
            <tr style={{ borderBottom: '2px solid var(--color-ak-dorado)' }}>
              <th className="sticky left-0 z-20 text-left py-2.5 px-3 font-semibold uppercase tracking-wide"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', minWidth: 160 }}>
                Producto
              </th>
              {columns.map((col, i) => (
                <th key={col}
                  className="text-right py-2.5 px-2 font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)', minWidth: 60 }}>
                  {colHeaders[i]}
                </th>
              ))}
              <th className="text-right py-2.5 px-3 font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-ak-dorado)', minWidth: 80 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const rowTotal = getTotal(matrix.get(product)!)
              return (
                <tr key={product}
                  className="hover:opacity-90 transition-opacity"
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)',
                  }}
                >
                  <td className="sticky left-0 z-10 py-2 px-3 font-medium"
                    style={{
                      background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}>
                    {product}
                  </td>
                  {columns.map((col) => {
                    const val = getCellValue(product, col)
                    const isMax = val > 0 && val === Math.max(...columns.map(c => getCellValue(product, c)))
                    const hasValue = val > 0
                    return (
                      <td key={col}
                        className="text-right py-2 px-2 tabular-nums"
                        style={{
                          color: hasValue
                            ? (valueMode === 'revenue' ? 'var(--color-ak-dorado)' : 'var(--text-primary)')
                            : 'var(--text-muted)',
                          fontWeight: isMax ? 700 : 400,
                        }}>
                        {hasValue ? formatCell(val) : '·'}
                      </td>
                    )
                  })}
                  <td className="text-right py-2 px-3 font-bold tabular-nums"
                    style={{ color: 'var(--color-ak-dorado)' }}>
                    {valueMode === 'revenue' ? fmt(rowTotal) : fmtN(rowTotal)}
                  </td>
                </tr>
              )
            })}
            {/* Column totals row */}
            <tr style={{
              borderTop: '2px solid var(--color-ak-dorado)',
              background: 'var(--color-ak-borgona)',
              opacity: 0.9,
            }}>
              <td className="py-2 px-3 font-bold uppercase tracking-wider"
                style={{ color: 'var(--color-ak-dorado)', fontSize: 11 }}>
                TOTAL
              </td>
              {columns.map((col) => {
                const total = columnTotals.get(col) || 0
                return (
                  <td key={col}
                    className="text-right py-2 px-2 font-bold tabular-nums"
                    style={{ color: 'var(--color-ak-dorado)', fontSize: 11 }}>
                    {formatCell(total)}
                  </td>
                )
              })}
              <td className="text-right py-2 px-3 font-bold tabular-nums"
                style={{ color: 'var(--color-ak-dorado)', fontSize: 12 }}>
                {formatCell([...columnTotals.values()].reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
