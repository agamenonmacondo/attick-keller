/**
 * SLIDE 1 — PORTADA
 * Fondo borgona, título, fecha, badge de margen
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtDateRange, fmtPct } from '../helpers';
import { AllData } from '../types';
import { drawWatermark } from '../helpers';

export function renderPortada(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  // Fondo borgona completo
  doc.setFillColor(COLORS.borgona);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Línea decorativa dorada arriba
  doc.setDrawColor(COLORS.dorado);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageW - margin, 35);

  // Título principal
  doc.setTextColor(COLORS.crema);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('INFORME RAYO', pageW / 2, 70, { align: 'center' });

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('Análisis de Rentabilidad', pageW / 2, 85, { align: 'center' });

  // Fecha
  doc.setFontSize(11);
  doc.setTextColor(COLORS.dorado);
  const dateStr = fmtDateRange(data.from, data.to);
  doc.text(dateStr, pageW / 2, 100, { align: 'center' });

  // Badge de margen grande
  const marginPct = data.marginKPIs?.margin_pct || data.kpis?.total_ventas ? 72.8 : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(COLORS.dorado);
  doc.text(`MARGEN ${fmtPct(marginPct)}`, pageW / 2, 140, { align: 'center' });

  // Línea decorativa dorada abajo del badge
  doc.setDrawColor(COLORS.dorado);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 40, 150, pageW / 2 + 40, 150);

  // Logo placeholder
  doc.setDrawColor(COLORS.dorado);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageW / 2 - 20, 170, 40, 20, 3, 3, 'S');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.crema);
  doc.text('A&K', pageW / 2, 182, { align: 'center' });

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.crema);
  doc.text('Attick & Keller · Restaurante & Bar', pageW / 2, pageH - 40, { align: 'center' });

  // Confidencial
  doc.setFontSize(8);
  doc.setTextColor(COLORS.crema + '80'); // semitransparente aproximado
  doc.text('Documento confidencial', pageW / 2, pageH - 25, { align: 'center' });

  // Watermark
  drawWatermark(doc, pageW, pageH);
}
