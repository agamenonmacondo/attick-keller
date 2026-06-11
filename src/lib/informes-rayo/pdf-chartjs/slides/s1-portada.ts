/**
 * SLIDE 1 — Portada Ejecutiva
 * Un número grande domina: ventas del día. Fecha, headline criollo.
 */
import { jsPDF } from 'jspdf'
import { AllData } from '../types'
import { COLORS, fmtMoney, fmtDateRange, calcDelta, drawSlideBg } from '../helpers'

export function renderPortada(doc: jsPDF, data: AllData, pageW: number, pageH: number): void {
  drawSlideBg(doc, pageW, pageH)

  const margin = 20
  const centerX = pageW / 2

  // Fecha + label
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text('INFORME RAYO', centerX, 40, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textSecondary)
  doc.text(fmtDateRange(data.from, data.to), centerX, 50, { align: 'center' })

  // Número grande: revenue
  const revenue = data.kpis.total_ventas
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text(fmtMoney(revenue), centerX, 100, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textSecondary)
  doc.text('ventas del período', centerX, 112, { align: 'center' })

  // Línea decorativa
  doc.setDrawColor(COLORS.gold)
  doc.setLineWidth(0.8)
  doc.line(centerX - 60, 126, centerX + 60, 126)

  // KPIs secundarios — 3 columnas
  const kpis = data.kpis
  const comp = data.comparison?.kpis
  const colW = (pageW - margin * 2) / 3
  const cols = [
    { label: 'cheques', value: kpis.total_cheques.toString(), sub: comp ? calcDeltaStr(kpis.total_cheques, comp.total_cheques) : null },
    { label: 'ticket promedio', value: fmtMoney(kpis.ticket_promedio), sub: comp ? calcDeltaStr(kpis.ticket_promedio, comp.ticket_promedio) : null },
    { label: 'personas', value: kpis.personas.toLocaleString('es-CO'), sub: comp ? calcDeltaStr(kpis.personas, comp.personas) : null },
  ]

  const kpiY = 150
  cols.forEach((col, i) => {
    const x = margin + colW * i
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(col.value, x + colW / 2, kpiY, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    doc.text(col.label, x + colW / 2, kpiY + 10, { align: 'center' })

    if (col.sub) {
      doc.setFontSize(8)
      doc.setTextColor(col.sub.color)
      doc.text(col.sub.text, x + colW / 2, kpiY + 20, { align: 'center' })
    }
  })

  // Headline IA (o fallback)
  const headline = data.analysis?.slide_2_headline || ''
  if (headline) {
    const hY = 200
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.gold)
    const hLines = doc.splitTextToSize('"' + headline + '"', pageW - margin * 2 - 20)
    doc.text(hLines, centerX, hY, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text('— Rayo, 6:02am', centerX, hY + hLines.length * 6 + 4, { align: 'center' })
  }
}

function calcDeltaStr(current: number, previous: number): { text: string; color: string } {
  if (!previous || previous === 0) return { text: '', color: COLORS.textMuted }
  const delta = ((current - previous) / previous) * 100
  const pct = Math.abs(delta).toFixed(1) + '%'
  if (delta > 0) return { text: '↑ ' + pct + ' vs anterior', color: COLORS.verde }
  if (delta < 0) return { text: '↓ ' + pct + ' vs anterior', color: COLORS.rojo }
  return { text: 'sin cambio', color: COLORS.textMuted }
}
