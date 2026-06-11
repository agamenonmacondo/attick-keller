/**
 * SLIDE 3 — ¿Qué está bajo la meta?
 * Solo productos con margen < 30% Y ventas reales > 5 unidades.
 * Muestra tendencia, revenue, margen actual.
 */
import { jsPDF } from 'jspdf'
import { AllData, ProductMargin } from '../types'
import { COLORS, fmtMoney, fmtPct, fmtNum, drawSlideBg } from '../helpers'

export function renderBajoMeta(doc: jsPDF, data: AllData, pageW: number, pageH: number): void {
  drawSlideBg(doc, pageW, pageH)

  const margin = 20
  let y = 35

  // Header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text('MARGEN < 30%', margin, y)
  y += 10

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('¿Qué está bajo la meta?', margin, y)
  y += 28

  // Filtrar productos: margen < 30% y con ventas reales (>5 unidades)
  const todasLasMargenes: ProductMargin[] = data.todos || []
  const bajoMeta = todasLasMargenes
    .filter(p => p.margin_pct < 30 && (p.quantity_sold || 0) > 5)
    .sort((a, b) => a.margin_pct - b.margin_pct) // ordenar por margen más bajo primero

  if (bajoMeta.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textMuted)
    doc.text('Ningún producto por debajo del 30% de margen con ventas significativas.', margin, y)
    return
  }

  // Mostrar hasta 8 productos
  const mostrar = bajoMeta.slice(0, 8)

  // Encabezados de columna
  const colX = [margin, margin + 130, pageW - margin]
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textMuted)
  doc.text('PRODUCTO', colX[0], y)
  doc.text('MARGEN', colX[1], y)
  doc.text('REVENUE', colX[2], y + 6, { align: 'right' })
  doc.text('UNIDADES', colX[2], y, { align: 'right' })
  y += 4

  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  const rowH = 22
  mostrar.forEach((product) => {
    // Nombre + categoría
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(truncate(product.product_name, 26), colX[0], y)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text(product.macro_category || '', colX[0], y + 6)

    // Margen porcentaje — rojo (alerta)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.rojo)
    doc.text(fmtPct(product.margin_pct), colX[1], y + 4)

    // Revenue
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    doc.text(fmtMoney(product.revenue), colX[2], y, { align: 'right' })

    // Unidades
    doc.text(fmtNum(product.quantity_sold || 0) + 'u', colX[2], y + 6, { align: 'right' })

    y += rowH
  })

  // Impacto estimado
  y += 12
  doc.setDrawColor(COLORS.borgona)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 12

  // Calcular cuánto se "pierde" vs meta 30%
  const impactoEstimado = mostrar.reduce((sum, p) => {
    const costAt30 = p.revenue * 0.70 // costo ideal si margen = 30%
    const costActual = p.revenue * (1 - p.margin_pct / 100) // costo real
    return sum + Math.max(0, costActual - costAt30)
  }, 0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('Impacto estimado vs meta 30%:', margin, y)

  doc.setFontSize(14)
  doc.setTextColor(COLORS.rojo)
  doc.text(fmtMoney(impactoEstimado), pageW - margin, y, { align: 'right' })

  // Sugerencias
  y += 20
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.borgonaLight)
  doc.text('→ Revisar recetas con cocina. Ajustar precios o ingredientes.', margin, y)
  y += 8
  doc.text('→ Evaluar si estos productos deben mantenerse en el menú.', margin, y)
}

function truncate(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '…'
}
