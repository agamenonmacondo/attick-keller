/**
 * SLIDE 6 — LO QUE IMPORTA
 * Top 7 productos por rentabilidad con barras de progreso
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtPct, drawHeader, drawWatermark, truncate } from '../helpers';
import { drawProgressBar } from '../charts';
import { AllData } from '../types';

export function renderImportan(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'LO QUE IMPORTA', 'Top 7 por rentabilidad', pageW, margin);
  y += 10;

  if (!data.importan || data.importan.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.madera);
    doc.text('No hay datos de productos estrella', pageW / 2, y + 40, { align: 'center' });
    drawWatermark(doc, pageW, pageH);
    return;
  }

  const top7 = data.importan.slice(0, 7);
  const maxMargin = Math.max(...top7.map((p) => p.margin_pct || 0), 1);
  const rowH = 12;
  const gap = 4;
  const numW = 15;
  const labelW = 55;
  const valueW = 50;
  const barW = pageW - margin * 2 - numW - labelW - valueW - 12;

  top7.forEach((product, i) => {
    const rowY = y + i * (rowH + gap);
    const numberX = margin;

    // Número dorado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.dorado);
    doc.text(String(i + 1), numberX, rowY + 8);

    // Nombre producto
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.chocolate);
    doc.text(truncate(product.product_name, 25), numberX + numW, rowY + 8);

    // Barra de progreso
    const barX = margin + numW + labelW;
    const barY = rowY + 2;
    const pct = maxMargin > 0 ? (product.margin_pct / maxMargin) * 100 : 0;
    const barColor = (product.margin_pct || 0) > 50 ? COLORS.dorado : COLORS.amarillo;

    drawProgressBar(doc, barX, barY, barW, 6, pct, barColor, COLORS.blanco);

    // Revenue + margin%
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.chocolate);
    const valText = `${fmtMoney(product.revenue)} · ${fmtPct(product.margin_pct || 0)}`;
    doc.text(valText, pageW - margin, rowY + 8, { align: 'right' });
  });

  drawWatermark(doc, pageW, pageH);
}
