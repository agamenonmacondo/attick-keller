/**
 * Currency formatting utilities for COP (Colombian Pesos)
 * Reusable across all POS dashboard components
 */

export function formatCOPFull(n: number): string {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Math.round(n).toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

export function formatCOPShort(n: number): string {
  if (n == null || isNaN(n)) return '$0'
  const abs = Math.abs(Math.round(n))
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace('.0', '') + 'K'
  return sign + '$' + abs.toLocaleString('es-CO')
}

export function formatCOPDisplay(n: number): string {
  if (n == null || isNaN(n)) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (abs >= 1_000) return '$' + Math.round(n).toLocaleString('es-CO')
  return '$' + Math.round(n)
}