/**
 * SLIDE 3 — LO QUE DRENA
 * Top 5 productos de bajo margen con barras
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, drawHeader, drawSlideBg, drawBar, truncate } from '../helpers'
import { AllData } from '../types'

export function renderDrena(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  const headline = data.analysis?.slide_3_headline ||
    `${data.drenan.length} productos en el 5% inferior`
  let y = drawHeader(doc, 'DIAGNÓSTICO OPERATIVO', 'Lo que drena el negocio',
    headline, pageW, margin, 24)

  y += 8
  const items = data.drenan.slice(0, 5)
  const maxMargin = Math.max(...items.map(p => p.margin_pct || 0), 1)

  items.forEach((p, i) => {
    const isWarning = p.margin_pct >= 30
    const barColor = p.margin_pct < 30 ? COLORS.ladrillo : COLORS.amarillo
    const barW = pageW - margin * 2
    const barH = 14
    const rowH = 52

    // Card background
    doc.setFillColor(COLORS.surface)
    doc.setDrawColor(isWarning ? COLORS.amarillo : COLORS.ladrillo)
    doc.roundedRect(margin, y, barW, rowH, 5, 5, 'FD')
    // Left border accent
    doc.setFillColor(isWarning ? COLORS.amarillo : COLORS.ladrillo)
    doc.rect(margin, y, 3, rowH, 'F')

    // Product name
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(truncate(p.product_name, 32).toUpperCase(), margin + 10, y + 14)

    // Revenue
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text(fmtMoney(p.revenue) + ' · 1 producto', margin + 10, y + 28)

    // Bar
    const barPct = Math.max(p.margin_pct, 5)
    drawBar(doc, margin + 10, y + 34, barW - 60, barH, barPct, barColor)

    // Percentage
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textSecondary)
    doc.text(Math.round(p.margin_pct) + '%', barW - 16, y + 45)

    y += rowH + 8
  })

  // Analysis footer
  const analysisText = data.analysis?.slide_3_drena
  if (analysisText && analysisText !== headline) {
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.textMuted)
    const lines = doc.splitTextToSize(analysisText, pageW - margin * 2 - 10)
    doc.text(lines, margin + 5, y)
  }
}
