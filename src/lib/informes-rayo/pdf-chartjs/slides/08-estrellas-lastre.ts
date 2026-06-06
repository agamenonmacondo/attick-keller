/**
 * SLIDE 8 — ESTRELLAS vs LASTRE
 * Dos columnas: top 5 importan (izquierda) vs bottom 5 drenan (derecha)
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtPct, drawHeader, drawWatermark, truncate } from '../helpers';
import { drawProgressBar } from '../charts';
import { AllData } from '../types';

export function renderEstrellasLastre(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'ANÁLISIS DE RENTABILIDAD', '', pageW, margin);
  y += 10;

  const colW = (pageW - margin * 2 - 8) / 2;
  const rowH = 10;
  const gap = 4;

  // ─── IZQUIERDA: Estrellas ───
  const leftX = margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.verde);
  doc.text('⭐ ESTRELLAS — Top 5', leftX, y);

  y += 8;

  const estrellas = (data.importan || []).slice(0, 5);
  const estMax = Math.max(...estrellas.map((p) => p.margin_bruto || 0), 1);

  if (estrellas.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.madera);
    doc.text('Sin datos', leftX, y + 4);
    y += rowH + gap;
  } else {
    estrellas.forEach((product) => {
      const pct = estMax > 0 ? ((product.margin_bruto || 0) / estMax) * 100 : 0;
      const barW = colW - 70;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.chocolate);
      doc.text(truncate(product.product_name, 18), leftX, y + 3);

      drawProgressBar(doc, leftX, y + 6, barW, 3, pct, COLORS.verde, COLORS.blanco);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.madera);
      const valText = `${fmtMoney(product.margin_bruto)} · ${fmtPct(product.margin_pct || 0)}`;
      doc.text(valText, leftX + barW + 2, y + 3.5);

      y += rowH + gap;
    });
  }

  // ─── DERECHA: Lastre ───
  const rightX = margin + colW + 8;
  const startRightY = y - (estrellas.length * (rowH + gap)) - 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.rojo);
  doc.text('⚠ LASTRE — Bottom 5', rightX, startRightY);

  let ry = startRightY + 8;

  const drenan = (data.drenan || []).slice(0, 5);
  const drenMax = Math.max(...drenan.map((p) => p.margin_bruto || 0), 1);

  if (drenan.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.madera);
    doc.text('Sin datos', rightX, ry + 4);
  } else {
    drenan.forEach((product) => {
      const pct = drenMax > 0 ? ((product.margin_bruto || 0) / drenMax) * 100 : 0;
      const barW = colW - 70;
      const barColor = (product.margin_pct || 0) > 30 ? COLORS.amarillo : COLORS.rojo;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.chocolate);
      doc.text(truncate(product.product_name, 18), rightX, ry + 3);

      drawProgressBar(doc, rightX, ry + 6, barW, 3, pct, barColor, COLORS.blanco);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.madera);
      const valText = `${fmtMoney(product.margin_bruto)} · ${fmtPct(product.margin_pct || 0)}`;
      doc.text(valText, rightX + barW + 2, ry + 3.5);

      ry += rowH + gap;
    });
  }

  drawWatermark(doc, pageW, pageH);
}
