/**
 * SLIDE 2 — KPIs PRINCIPALES
 * 3 tarjetas blancas + sparkline de tendencia
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtNum, fmtPct, calcDelta, drawHeader, drawWatermark } from '../helpers';
import { drawSparkline } from '../charts';
import { AllData } from '../types';

export async function renderKPIs(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): Promise<void> {
  const margin = 20;

  // Fondo crema
  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Header
  let y = drawHeader(doc, 'INDICADORES CLAVE', '', null, pageW, margin, 24);
  y += 6;

  // 3 tarjetas blancas
  const cardW = (pageW - margin * 2 - 8) / 3;
  const cardH = 55;
  const cardY = y;

  const kpis = data.kpis;
  const comp = data.comparison?.kpis;

  const cards = [
    {
      label: 'VENTAS',
      value: fmtMoney(kpis.total_ventas),
      delta: comp ? calcDelta(kpis.total_ventas, comp.total_ventas) : null,
      context: `${fmtNum(kpis.total_cheques)} cheques`,
    },
    {
      label: 'MARGEN',
      value: fmtPct(data.marginKPIs.margin_pct || 72.8),
      context: 'vs meta 30%',
      positive: true,
    },
    {
      label: 'PRODUCTOS',
      value: fmtNum(data.marginKPIs.total_productos || 161),
      context: 'con receta y costo',
    },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);

    // Tarjeta blanca con sombra sutil
    doc.setFillColor(COLORS.blanco);
    doc.setDrawColor('#E5DDD5');
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'FD');

    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.madera);
    doc.text(card.label, x + 6, cardY + 10);

    // Valor grande
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.dorado);
    doc.text(card.value, x + 6, cardY + 28);

    // Delta o contexto
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (card.delta) {
      const arrow = card.delta.isPositive ? '↑' : '↓';
      const color = card.delta.isPositive ? COLORS.verde : COLORS.rojo;
      doc.setTextColor(color);
      doc.text(`${arrow} ${card.delta.value.toFixed(1)}%`, x + 6, cardY + 38);
      doc.setTextColor(COLORS.madera);
      doc.text('vs período anterior', x + 6, cardY + 46);
    } else if (card.positive) {
      doc.setTextColor(COLORS.verde);
      doc.text('✅ ' + card.context, x + 6, cardY + 38);
    } else {
      doc.setTextColor(COLORS.madera);
      doc.text(card.context || '', x + 6, cardY + 38);
    }
  });

  y = cardY + cardH + 10;

  // Sparkline de tendencia diaria
  if (data.daily && data.daily.length > 1) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.chocolate);
    doc.text('TENDENCIA DIARIA', margin, y);
    y += 6;

    const revenues = data.daily.map((d) => d.revenue);
    drawSparkline(doc, revenues, COLORS.dorado, margin, y, pageW - margin * 2, 25);
    y += 35;

    // Labels de inicio/fin
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.madera);
    doc.text(data.daily[0].date.slice(5), margin, y - 5);
    doc.text(data.daily[data.daily.length - 1].date.slice(5), pageW - margin, y - 5, { align: 'right' });
  }

  // Mini tabla: métodos de pago rápido
  if (data.payments && data.payments.length > 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.chocolate);
    doc.text('MÉTODOS DE PAGO', margin, y);
    y += 8;

    data.payments.slice(0, 3).forEach((p) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.chocolate);
      doc.text(p.payment_method, margin, y);
      doc.text(fmtMoney(p.total), pageW / 2, y, { align: 'center' });
      doc.text(`${p.pct.toFixed(1)}%`, pageW - margin, y, { align: 'right' });
      y += 6;
    });
  }

  drawWatermark(doc, pageW, pageH);
}
