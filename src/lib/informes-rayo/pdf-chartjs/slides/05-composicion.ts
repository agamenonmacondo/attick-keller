/**
 * SLIDE 5 — COMPOSICIÓN DEL MARGEN
 * Barras horizontales por categoría con revenue + SKU count
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, fmtNum, drawHeader, drawSlideBg, drawBar, CAT_COLORS } from '../helpers'
import { AllData } from '../types'

export function renderComposicion(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  const headline = data.analysis?.slide_5_headline || null
  let y = drawHeader(doc, 'ESTRUCTURA DE RENTABILIDAD', 'Composición del margen',
    headline, pageW, margin, 24)

  y += 8
  const cats = data.categories
  if (!cats || cats.length === 0) {
    doc.setFontSize(12)
    doc.setTextColor(COLORS.textMuted)
    doc.text('Sin datos de categorías', margin, y + 20)
    return
  }

  const maxRev = Math.max(...cats.map(c => c.revenue || 0), 1)
  const labelW = 48
  const metaW = 70
  const barW = pageW - margin * 2 - labelW - metaW - 10
  const barH = 18
  const rowH = 38

  cats.forEach(c => {
    const color = CAT_COLORS[c.categoria.toUpperCase()] || COLORS.gold
    const barPct = maxRev > 0 ? ((c.revenue || 0) / maxRev) * 100 : 0

    // Category label
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(color)
    doc.text(c.categoria, margin + labelW, y + 4, { align: 'right' })

    // Bar with percentage text
    drawBar(doc, margin + labelW + 6, y, barW, barH, Math.max(barPct, 5), color)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.bg)
    doc.text(c.margin_pct + '%', margin + labelW + Math.max(barPct * barW / 100, 30) - 2, y + 13, { align: 'right' })

    // Meta: revenue + SKU count
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text('Rev: ' + fmtMoney(c.revenue), margin + labelW + barW + 16, y + 6)
    doc.setFontSize(8)
    doc.text('SKU: ' + fmtNum(c.count), margin + labelW + barW + 16, y + 16)

    y += rowH
  })

  // Analysis text
  const analysisText = data.analysis?.slide_5_composicion
  if (analysisText && analysisText !== headline) {
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.verdeMuted)
    const lines = doc.splitTextToSize(analysisText, pageW - margin * 2 - 10)
    doc.text(lines, margin + 5, y)
  }
}
