/**
 * SLIDE 4 — COMPOSICIÓN DE PAGOS
 * Donut chart + leyenda con métodos de pago
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtNum, drawHeader, drawWatermark } from '../helpers';
import { drawDonut } from '../charts';
import { AllData } from '../types';

const PAY_COLORS = ['#C9A94E', '#6B2737', '#4A7C59'];

export function renderPagos(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'COMPOSICIÓN DE PAGOS', '', pageW, margin);
  y += 6;

  if (!data.payments || data.payments.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.madera);
    doc.text('No hay datos de pagos para el período seleccionado', pageW / 2, y + 40, { align: 'center' });
    drawWatermark(doc, pageW, pageH);
    return;
  }

  // Donut centrado
  const values = data.payments.map((p) => p.total);
  const totalPayments = values.reduce((a, b) => a + b, 0);
  const colors = data.payments.map((_, i) => PAY_COLORS[i % PAY_COLORS.length]);
  const centerText = `TOTAL\n${fmtMoney(totalPayments)}`;

  const donutCX = pageW / 2;
  const donutCY = margin + 25 + 40;
  drawDonut(doc, values, colors, centerText, donutCX, donutCY, 35);

  // Leyenda debajo del donut
  const legendY = donutCY + 50;
  const legendX = margin + 10;

  data.payments.forEach((p, i) => {
    const lx = legendX + (i % 3) * ((pageW - margin * 2 - 20) / 3);
    const ly = legendY + Math.floor(i / 3) * 20;

    // Círculo de color
    doc.setFillColor(colors[i]);
    doc.ellipse(lx + 3, ly + 3, 3, 3, 'F');

    // Método
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.chocolate);
    doc.text(p.payment_method, lx + 9, ly + 4);

    // Monto y %
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.madera);
    doc.text(`${fmtMoney(p.total)} · ${p.pct.toFixed(1)}%`, lx + 9, ly + 10);

    // Número de cheques
    doc.setFontSize(7);
    doc.setTextColor(COLORS.gris);
    doc.text(`${fmtNum(p.cheques)} cheques`, lx + 9, ly + 16);
  });

  drawWatermark(doc, pageW, pageH);
}
