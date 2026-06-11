/**
 * SLIDE 2 — ¿Quién puso la plata?
 * Top 7 productos por margen bruto en pesos. Barras horizontales.
 */
import { jsPDF } from 'jspdf'
import { AllData } from '../types'
import { COLORS, fmtMoney, fmtPct, fmtNum, drawSlideBg, drawBar } from '../helpers'

export function renderQuienPuso(doc: jsPDF, data: AllData, pageW: number, pageH: number): void {
  drawSlideBg(doc, pageW, pageH)

  const margin = 20
  let y = 35

  // Header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text('MARGEN BRUTO', margin, y)
  y += 10

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('¿Quién puso la plata?', margin, y)
  y += 28

  // Top 7 productos
  const top7 = data.importan.slice(0, 7)
  if (top7.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textMuted)
    doc.text('Sin datos de margen disponibles para este período.', margin, y)
    return
  }

  // Encontrar el max margin_bruto para escalar barras
  const maxMargin = Math.max(...top7.map(p => p.margin_bruto))

  const barH = 18
  const barW = pageW - margin * 2 - 100 // deja espacio para valor a la derecha
  const gap = 10

  top7.forEach((product, i) => {
    const pct = maxMargin > 0 ? (product.margin_bruto / maxMargin) * 100 : 0

    // Barra
    drawBar(doc, margin, y + 12, barW, 11, pct, COLORS.gold)

    // Nombre producto
    const name = truncateProduct(product.product_name, 30)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(name, margin, y)

    // Datos debajo del nombre
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    const info = fmtPct(product.margin_pct) + ' margen · ' + fmtNum(product.quantity_sold || 0) + 'u'
    doc.text(info, margin, y + 5)

    // Valor margen bruto a la derecha
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.gold)
    doc.text(fmtMoney(product.margin_bruto), pageW - margin, y + 2, { align: 'right' })

    y += barH + gap
  })

  // Total margen bruto abajo
  y += 10
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('Margen bruto total:', margin, y)

  doc.setFontSize(14)
  doc.setTextColor(COLORS.gold)
  doc.text(fmtMoney(data.marginKPIs.margin_bruto), pageW - margin, y, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textSecondary)
  doc.text('(' + fmtPct(data.marginKPIs.margin_pct) + ' ponderado)', pageW - margin, y + 10, { align: 'right' })
}

function truncateProduct(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '…'
}
