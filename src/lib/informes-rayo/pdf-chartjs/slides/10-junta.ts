/**
 * SLIDE 10 — PARA LA JUNTA
 * 3 tarjetas verticales con acciones concretas
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtPct, fmtNum, drawHeader, drawWatermark } from '../helpers';
import { AllData } from '../types';

export function renderJunta(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'PARA LA JUNTA', '3 acciones concretas', null, pageW, margin, 24);
  y += 10;

  const cardW = pageW - margin * 2;
  const cardH = 35;
  const gap = 8;
  const borderW = 3;
  const pad = 8;

  // Buscar categoría BEBIDAS
  const catBebidas = ((data.categories || []).find(
    (c) => c.categoria === 'BEBIDAS'
  ));

  const cards = [
    {
      color: COLORS.verde,
      icon: '✅',
      text: catBebidas
        ? `BEBIDAS lidera con ${fmtPct(catBebidas.margin_pct)} margen → mantener precios y promociones`
        : 'Categoría líder → mantener precios y promociones',
    },
    {
      color: COLORS.amarillo,
      icon: '⚠',
      text: `${fmtNum((data.drenan || []).length)} productos en el 5% inferior por ganancia neta → evaluar menú`,
    },
    {
      color: COLORS.dorado,
      icon: '🔥',
      text: `Margen general ${fmtPct(data.marginKPIs?.margin_pct || 0)} → saludable, sobre meta del 30%`,
    },
  ];

  cards.forEach((card, i) => {
    const cardY = y + i * (cardH + gap);

    // Fondo blanco
    doc.setFillColor(COLORS.blanco);
    doc.rect(margin, cardY, cardW, cardH, 'F');

    // Borde lateral
    doc.setFillColor(card.color);
    doc.rect(margin, cardY, borderW, cardH, 'F');

    // Icono
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(card.icon, margin + borderW + pad, cardY + cardH / 2 + 3);

    // Texto
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.chocolate);
    doc.text(
      card.text,
      margin + borderW + pad + 12,
      cardY + cardH / 2 + 2,
      { maxWidth: cardW - borderW - pad - 20 }
    );
  });

  drawWatermark(doc, pageW, pageH);
}
