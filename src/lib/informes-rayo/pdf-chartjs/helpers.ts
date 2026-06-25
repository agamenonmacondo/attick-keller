/**
 * Helpers: colores (dark Claude Design), formato numérico, layout utils para PDF
 */
import { jsPDF } from 'jspdf'

export const COLORS = {
  bg: '#0D0D0C',
  surface: '#141414',
  surface2: '#1A1A1A',
  textPrimary: '#F0EDE8',
  textSecondary: '#9A9590',
  textMuted: '#6B6560',
  gold: '#FCCC04',
  goldLight: '#FFE066',
  goldDark: '#B8960B',
  borgona: '#8C4434',
  borgonaLight: '#A05840',
  ladrillo: '#A0522D',
  verde: '#4ADE80',
  verdeMuted: '#2D6A3F',
  amarillo: '#FACC15',
  rojo: '#EF4444',
  track: '#1A1A1A',
  border: '#262626',
  white: '#FFFFFF',
  madera: '#9BA8B7',
  dorado: '#FCCC04',
  crema: '#F4ECE4',
  chocolate: '#3C4C5C',
  blanco: '#FFFFFF',
  gris: '#7A7A7A',
}

export const CAT_COLORS: Record<string, string> = {
  BEBIDAS: '#4ADE80',
  COCTELES: '#C9A94E',
  LICORES: '#E8D48B',
  COMIDA: '#5D1528',
  VINOS: '#A0522D',
}

/** Formatea dinero: $791.2M, $12.5K, $450 */
export function fmtMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

/** Formatea número con separadores de miles */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

/** Formatea porcentaje: 72.8% */
export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

/** Rango de fechas: "1–31 Mayo 2026" */
export function fmtDateRange(from: string, to: string): string {
  const d1 = new Date(from + 'T00:00:00')
  const d2 = new Date(to + 'T00:00:00')
  const meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ]
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
    return `${d1.getDate()}–${d2.getDate()} ${meses[d1.getMonth()]} ${d1.getFullYear()}`
  }
  return `${d1.getDate()} ${meses[d1.getMonth()]} – ${d2.getDate()} ${meses[d2.getMonth()]} ${d2.getFullYear()}`
}

/** Calcula delta porcentual entre actual y anterior */
export function calcDelta(current: number, previous: number): { value: number; isPositive: boolean } {
  if (!previous || previous === 0) return { value: 0, isPositive: true }
  const delta = ((current - previous) / previous) * 100
  return { value: Math.abs(delta), isPositive: delta >= 0 }
}

/** Trunca texto con ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

/** Dibuja watermark en footer de cada slide */
export function drawWatermark(doc: jsPDF, pageW: number, pageH: number): void {
  doc.setFontSize(8)
  doc.setTextColor(COLORS.textMuted)
  doc.setFont('helvetica', 'normal')
  doc.text('A&K · Confidencial', pageW / 2, pageH - 8, { align: 'center' })
}

/** Header estándar para slides: label + title + headline opcional */
export function drawHeader(
  doc: jsPDF,
  label: string,
  title: string,
  headline: string | null,
  pageW: number,
  margin: number,
  startY: number
): number {
  let y = startY
  // Label
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text(label.toUpperCase(), margin, y)
  y += 10
  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text(title, margin, y)
  y += 24
  // Headline (optional)
  if (headline) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.gold)
    const hlLines = doc.splitTextToSize(headline, pageW - margin * 2 - 14)
    doc.text(hlLines, margin + 6, y + 4)
    y += hlLines.length * 5 + 16
  }
  return y
}

/** Dibuja una barra horizontal con track + fill */
export function drawBar(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  fillPct: number, fillColor: string
): void {
  // Track background
  doc.setFillColor(COLORS.track)
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
  // Fill
  if (fillPct > 0) {
    doc.setFillColor(fillColor)
    const fillW = w * Math.min(fillPct / 100, 1)
    if (fillW > h) {
      doc.roundedRect(x, y, fillW, h, h / 2, h / 2, 'F')
    }
  }
}

/** Dibuja fondo de slide + watermark */
export function drawSlideBg(doc: jsPDF, pageW: number, pageH: number): void {
  doc.setFillColor(COLORS.bg)
  doc.rect(0, 0, pageW, pageH, 'F')
  drawWatermark(doc, pageW, pageH)
}
