/**
 * SLIDE 2 — MÉTRICAS CLAVE
 * 4 KPI cards + headline
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, fmtNum, fmtPct, drawHeader, drawSlideBg, calcDelta } from '../helpers'
import { AllData } from '../types'

export function renderMetricas(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20
  drawSlideBg(doc, pageW, pageH)

  let y = drawHeader(doc, 'RESUMEN EJECUTIVO', 'Métricas clave del período',
    data.analysis?.slide_2_headline || null, pageW, margin, 24)

  y += 6
  const mk = data.marginKPIs
  const cardW = (pageW - margin * 2 - 16) / 2
  const cardH = 50
  const gap = 14

  // Row 1
  drawMetricCard(doc, margin, y, cardW, cardH, '$' + fmtMoney(mk.total_revenue).replace('$',''), 'VENTAS TOTALES', data)
  drawMetricCard(doc, margin + cardW + gap, y, cardW, cardH, fmtPct(mk.margin_pct), 'MARGEN GENERAL', data)
  y += cardH + gap

  // Row 2
  drawMetricCard(doc, margin, y, cardW, cardH, fmtNum(mk.total_productos), 'PRODUCTOS', data)
  drawMetricCard(doc, margin + cardW + gap, y, cardW, cardH, '$' + fmtMoney(mk.margin_bruto).replace('$',''), 'MARGEN BRUTO', data)

  // Analysis text if available
  const analysisText = data.analysis?.slide_2_metrics
  if (analysisText && analysisText !== data.analysis?.slide_2_headline) {
    const textY = y + cardH + 18
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.gold)
    const lines = doc.splitTextToSize(analysisText, pageW - margin * 2 - 20)
    doc.text(lines, margin + 10, textY)
  }
}

function drawMetricCard(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, data: AllData) {
  // Card background
  doc.setFillColor(COLORS.surface)
  doc.setDrawColor(COLORS.border)
  doc.roundedRect(x, y, w, h, 5, 5, 'FD')

  // Value
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text(value, x + 10, y + 22)

  // Label
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textMuted)
  doc.text(label, x + 10, y + 42)
}
