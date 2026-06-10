/**
 * SLIDE 6 — ESTRELLAS vs LASTRE
 * Dos columnas lado a lado
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtMoney, drawHeader, drawSlideBg, drawBar, truncate } from '../helpers'
import { AllData } from '../types'

export function renderEstrellasLastre(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 18
  drawSlideBg(doc, pageW, pageH)

  const analysisText = data.analysis?.slide_6_estrellas_lastre || null
  let y = drawHeader(doc, 'DUALIDAD OPERATIVA', 'Estrellas vs Lastre',
    analysisText, pageW, margin, 24)

  const colW = (pageW - margin * 2 - 12) / 2
  y += 6

  // Left column: ESTRELLAS
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.verde)
  doc.text('ESTRELLAS — Top 5', margin, y)
  y += 10

  const estrellas = [...data.importan].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0)).slice(0, 5)
  const maxStar = Math.max(...estrellas.map(p => p.margin_pct || 0), 1)
  let leftY = y

  estrellas.forEach(p => {
    const barPct = maxStar > 0 ? ((p.margin_pct || 0) / maxStar) * 100 : 0
    doc.setFillColor(COLORS.surface)
    doc.setDrawColor(COLORS.border)
    doc.roundedRect(margin, leftY, colW, 30, 4, 4, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(truncate(p.product_name, 20).toUpperCase(), margin + 6, leftY + 10)

    drawBar(doc, margin + 6, leftY + 16, colW - 50, 5, Math.max(barPct, 10), COLORS.verde)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textSecondary)
    doc.text(fmtMoney(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%', margin + colW - 4, leftY + 11, { align: 'right' })

    leftY += 34
  })

  // Right column: LASTRE
  const rightX = margin + colW + 12
  y = drawHeader(doc, '', '', null, pageW, margin, 24) // no-op, just for position

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.rojo)
  doc.text('LASTRE — Bottom 5', rightX, margin + 56) // aligned with content start

  const lastre = [...data.drenan].sort((a, b) => (a.margin_pct || 0) - (b.margin_pct || 0)).slice(0, 5)
  const maxLastre = Math.max(...lastre.map(p => Math.abs(p.margin_pct || 0)), 1)
  let rightY = margin + 66

  lastre.forEach(p => {
    const barPct = maxLastre > 0 ? (Math.abs(p.margin_pct || 0) / maxLastre) * 100 : 0
    const color = (p.margin_pct || 0) < 30 ? COLORS.amarillo : COLORS.verde

    doc.setFillColor(COLORS.surface)
    doc.setDrawColor(COLORS.border)
    doc.roundedRect(rightX, rightY, colW, 30, 4, 4, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(truncate(p.product_name, 20).toUpperCase(), rightX + 6, rightY + 10)

    drawBar(doc, rightX + 6, rightY + 16, colW - 50, 5, Math.max(barPct, 10), color)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textSecondary)
    doc.text(fmtMoney(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%', rightX + colW - 4, rightY + 11, { align: 'right' })

    rightY += 34
  })
}
