/**
 * SLIDE 8 — PARA LA JUNTA + MENSAJE AL EQUIPO
 * 3 cards de recomendación + bloque narrativo
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtPct, drawHeader, drawSlideBg } from '../helpers'
import { AllData } from '../types'

export function renderJunta(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  let y = drawHeader(doc, 'RECOMENDACIONES', 'Para la junta',
    null, pageW, margin, 24)

  y += 8
  const mk = data.marginKPIs
  const cats = data.categories
  const bestCat = cats.length > 0 ? [...cats].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))[0] : null
  const drenaCount = data.drenan.length

  // 3 cards
  const cards = data.analysis?.slide_8_cards?.length
    ? data.analysis.slide_8_cards.slice(0, 3).map((c, i) => ({
        emoji: c.emoji || ['✅', '⚠', '◉'][i],
        text: (c.title ? c.title + ' — ' : '') + c.action,
        metric: c.metric || '',
        color: ['verde', 'amarillo', 'gold'][i] || 'gold'
      }))
    : [
        {
          emoji: '✅', text: bestCat
            ? `${bestCat.categoria.toUpperCase()} lidera con ${Math.round(bestCat.margin_pct)}% margen — Mantener precios y duplicar promociones`
            : 'Margen saludable — Mantener estrategia',
          metric: bestCat ? Math.round(bestCat.margin_pct) + '% margen' : '', color: 'verde'
        },
        {
          emoji: '⚠', text: `${drenaCount} productos en el 5% inferior — Evaluar menú: ajustar precios o replantear referencias`,
          metric: 'Bottom 5%', color: 'amarillo'
        },
        {
          emoji: '◉', text: `Margen general ${mk.margin_pct.toFixed(1)}% — saludable. Revisar presupuesto Q3 con este escenario`,
          metric: mk.margin_pct.toFixed(1) + '% margen', color: 'gold'
        },
      ]

  const colorMap: Record<string, string> = { verde: COLORS.verde, amarillo: COLORS.amarillo, gold: COLORS.gold }

  cards.forEach(c => {
    const cardH = 40
    const borderColor = colorMap[c.color] || COLORS.gold

    doc.setFillColor(COLORS.surface2)
    doc.setDrawColor(borderColor)
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 5, 5, 'FD')
    // Left border
    doc.setFillColor(borderColor)
    doc.rect(margin, y, 3, cardH, 'F')

    // Emoji
    doc.setFontSize(16)
    doc.text(c.emoji, margin + 10, y + 22)

    // Text
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    const lines = doc.splitTextToSize(c.text, pageW - margin * 2 - 70)
    doc.text(lines, margin + 28, y + 16)

    // Metric
    if (c.metric) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(COLORS.gold)
      doc.text(c.metric, pageW - margin - 10, y + 16, { align: 'right' })
    }

    y += cardH + 10
  })

  y += 6

  // Mensaje al equipo
  const mensaje = data.analysis?.slide_junta_mensaje
  if (mensaje) {
    doc.setDrawColor(COLORS.gold + '30')
    doc.setFillColor(COLORS.borgona + '20')
    doc.roundedRect(margin, y, pageW - margin * 2, 100, 5, 5, 'FD')

    doc.setFontSize(14)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.gold)
    doc.text('Mensaje al equipo', margin + 12, y + 14)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    const cleanMsg = mensaje.replace(/\*\*/g, '')
    const msgLines = doc.splitTextToSize(cleanMsg, pageW - margin * 2 - 24)
    doc.text(msgLines.slice(0, 10), margin + 12, y + 28)
  }

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textMuted)
  doc.text('Informe generado · Attick & Keller · ' +
    new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageW / 2, pageH - 20, { align: 'center' })
}
