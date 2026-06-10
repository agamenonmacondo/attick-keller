/**
 * SLIDE 4 — LO QUE IMPORTA (Top 7)
 * Productos con mayor margen bruto, ranked
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, fmtPct, drawHeader, drawSlideBg, drawBar, truncate, CAT_COLORS } from '../helpers'
import { AllData } from '../types'

export function renderImportan(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  const analysisText = data.analysis?.slide_4_importan || null
  let y = drawHeader(doc, 'TOP PERFORMERS', 'Lo que importa — Top 7',
    analysisText, pageW, margin, 24)

  y += 6
  const items = data.importan.slice(0, 7)
  const maxMargin = Math.max(...items.map(p => p.margin_bruto || 0), 1)
  const barW = pageW - margin * 2 - 80

  items.forEach((p, i) => {
    const barPct = maxMargin > 0 ? ((p.margin_bruto || 0) / maxMargin) * 100 : 0
    const catColor = CAT_COLORS[p.macro_category?.toUpperCase()] || COLORS.gold

    // Rank number
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.gold)
    doc.text(`${i + 1}`, margin, y + 12)

    // Product name
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(truncate(p.product_name, 30).toUpperCase(), margin + 12, y + 8)

    // Bar
    drawBar(doc, margin + 12, y + 14, barW, 8, Math.max(barPct, 10), catColor)

    // Revenue
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.gold)
    doc.text(fmtMoney(p.revenue), barW + margin + 24, y + 9, { align: 'right' })

    // Margin pct
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text(Math.round(p.margin_pct) + '%', barW + margin + 24, y + 21, { align: 'right' })

    // Divider
    if (i < items.length - 1) {
      doc.setDrawColor(COLORS.border)
      doc.setLineWidth(0.2)
      doc.line(margin, y + 28, pageW - margin, y + 28)
    }
    y += 32
  })
}
