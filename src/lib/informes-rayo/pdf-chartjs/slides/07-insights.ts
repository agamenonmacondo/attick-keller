/**
 * SLIDE 7 — DATOS QUE IMPORTAN
 * Bullet points (IA o reglas)
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, drawHeader, drawSlideBg } from '../helpers'
import { AllData } from '../types'

export function renderInsights(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  let y = drawHeader(doc, 'INTELIGENCIA OPERATIVA', 'Datos que importan',
    null, pageW, margin, 24)

  y += 8

  // Build bullets: IA first, then data fallback
  const bullets: string[] = []
  if (data.analysis?.slide_7_insights?.length) {
    data.analysis.slide_7_insights.forEach(b => bullets.push(b.body))
  } else if (data.analysis?.slide_7_bullets?.length) {
    data.analysis.slide_7_bullets.forEach(b => bullets.push(b.body))
  }

  if (bullets.length === 0) {
    // Data fallback
    const topImportan = data.importan[0]
    const cats = data.categories
    const bestCat = cats.length > 0 ? [...cats].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))[0] : null
    const worstCat = cats.length > 0 ? [...cats].sort((a, b) => (a.margin_pct || 0) - (b.margin_pct || 0))[0] : null

    if (topImportan) bullets.push(topImportan.product_name + ' genera ' + fmtMoney(topImportan.margin_bruto) + ' netos — #1 en margen')
    if (bestCat) bullets.push(bestCat.categoria + ' lidera con ' + Math.round(bestCat.margin_pct) + '% de margen en ' + bestCat.count + ' SKUs')
    if (worstCat && worstCat.categoria !== bestCat?.categoria) bullets.push(worstCat.categoria + ' en ' + Math.round(worstCat.margin_pct) + '% — la categoría más débil')
    bullets.push('Margen general ' + data.marginKPIs.margin_pct.toFixed(1) + '% supera meta del 30%')
    if (data.drenan.length > 0) bullets.push(data.drenan.length + ' productos en bottom 5% drenan rentabilidad')
  }

  const maxW = pageW - margin * 2
  bullets.slice(0, 5).forEach(b => {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    // Draw bullet
    doc.text('•', margin, y + 3)
    // Draw text with word wrap — defensive: ensure string
    const cleanB = (b || '').replace(/<[^>]+>/g, '') // strip HTML
    const lines = doc.splitTextToSize(cleanB, maxW - 12)
    doc.text(lines, margin + 10, y + 3)
    y += lines.length * 7 + 12
  })
}
