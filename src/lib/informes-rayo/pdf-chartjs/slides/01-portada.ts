/**
 * SLIDE 1 — PORTADA (Dark Claude Design)
 * Fondo borgona, título "Informe Rayo", fecha
 */

import { jsPDF } from 'jspdf'
import { COLORS, fmtDateRange, drawWatermark } from '../helpers'
import { AllData } from '../types'

export function renderPortada(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 24

  // Fondo borgona completo
  doc.setFillColor(COLORS.borgona)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Logo
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text('ATTICK & KELLER', margin, 30)

  // Fecha
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textSecondary)
  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(today, pageW - margin, 30, { align: 'right' })

  // Script subtitle
  doc.setFontSize(24)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(COLORS.goldLight)
  doc.text('Informe de rentabilidad', pageW / 2, 105, { align: 'center' })

  // Título principal
  doc.setFontSize(40)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('INFORME', pageW / 2, 132, { align: 'center' })
  doc.text('RAYO', pageW / 2, 155, { align: 'center' })

  // Subtítulo
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textSecondary)
  doc.text('Análisis de márgenes y decisiones', pageW / 2, 178, { align: 'center' })
  doc.text('para la junta directiva', pageW / 2, 192, { align: 'center' })

  // Línea separatora
  doc.setDrawColor(COLORS.gold + '40')
  doc.setLineWidth(0.3)
  doc.line(margin, 210, pageW - margin, 210)

  // Período + página
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.goldLight)
  const dateLabel = fmtDateRange(data.from, data.to)
  doc.text(dateLabel, margin, 224)

  doc.setFontSize(10)
  doc.setTextColor(COLORS.textMuted)
  doc.text('01 / 8', pageW - margin, 224, { align: 'right' })

  // Confidencial
  doc.setFontSize(8)
  doc.setTextColor(COLORS.textMuted)
  doc.text('A&K · Confidencial', pageW - margin, pageH - 14, { align: 'right' })
}
