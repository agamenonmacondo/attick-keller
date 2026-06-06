/**
 * SLIDE 7 — COMPOSICIÓN DEL MARGEN
 * Barras horizontales por categoría (revenue + margin_pct)
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtPct, drawHeader, drawWatermark } from '../helpers';
import { CAT_COLORS } from '../helpers';
import { AllData } from '../types';

export function renderComposicion(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'COMPOSICIÓN POR CATEGORÍA', '', pageW, margin);
  y += 10;

  if (!data.categories || data.categories.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.madera);
    doc.text('No hay datos de categorías', pageW / 2, y + 40, { align: 'center' });
    drawWatermark(doc, pageW, pageH);
    return;
  }

  // Ordenar por revenue descendente
  const sorted = [...data.categories].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const maxRev = Math.max(...sorted.map((c) => c.revenue || 0), 1);

  const labelW = 40;
  const barW = pageW - margin * 2 - labelW - 50;
  const barH = 8;
  const gap = 4;

  sorted.forEach((cat) => {
    // Label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.chocolate);
    doc.text(cat.categoria, margin, y + barH - 1);

    // Fondo blanco de barra
    doc.setFillColor(COLORS.blanco);
    doc.rect(margin + labelW, y, barW, barH, 'F');

    // Relleno de barra
    const pct = maxRev > 0 ? ((cat.revenue || 0) / maxRev) : 0;
    if (pct > 0) {
      const color = CAT_COLORS[cat.categoria] || COLORS.dorado;
      doc.setFillColor(color);
      doc.rect(margin + labelW, y, barW * Math.min(pct, 1), barH, 'F');
    }

    // Valor a la derecha
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.chocolate);
    doc.text(
      `${fmtMoney(cat.revenue)} · ${fmtPct(cat.margin_pct || 0)}`,
      margin + labelW + barW + 4,
      y + barH - 1
    );

    y += barH + gap;
  });

  drawWatermark(doc, pageW, pageH);
}
