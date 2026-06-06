/**
 * SLIDE 5 — RENTABILIDAD RESUMEN
 * 3 tarjetas + semáforo de categorías
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtNum, fmtPct, drawHeader, drawWatermark } from '../helpers';
import { AllData } from '../types';

export function renderRentabilidad(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  const headerSub = data.marginKPIs ? `MARGEN ${fmtPct(data.marginKPIs.margin_pct)}` : '';
  let y = drawHeader(doc, 'RENTABILIDAD', headerSub, pageW, margin);
  y += 6;

  // 3 tarjetas en fila
  const cardW = (pageW - margin * 2 - 8) / 3;
  const cardH = 42;
  const cardY = y;

  const cards = [
    {
      label: 'PRODUCTOS CON RECETA',
      value: fmtNum(data.marginKPIs?.total_productos || 0),
      context: 'con costo calculado',
    },
    {
      label: 'MARGEN GENERAL',
      value: fmtPct(data.marginKPIs?.margin_pct || 0),
      context: 'vs meta 30%',
      positive: (data.marginKPIs?.margin_pct || 0) >= 30,
    },
    {
      label: 'CATEGORÍAS ACTIVAS',
      value: fmtNum(data.categories?.length || 0),
      context: 'macrocategorías',
    },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);

    doc.setFillColor(COLORS.blanco);
    doc.setDrawColor('#E5DDD5');
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.madera);
    doc.text(card.label, x + 6, cardY + 10);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.dorado);
    doc.text(card.value, x + 6, cardY + 28);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (card.positive !== undefined) {
      doc.setTextColor(card.positive ? COLORS.verde : COLORS.rojo);
      doc.text(card.positive ? `✅ ${card.context}` : `⚠ ${card.context}`, x + 6, cardY + 38);
    } else {
      doc.setTextColor(COLORS.madera);
      doc.text(card.context, x + 6, cardY + 38);
    }
  });

  y = cardY + cardH + 10;

  // Línea de semáforo por categoría
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.chocolate);
  doc.text('SEMÁFORO POR CATEGORÍA', margin, y);
  y += 10;

  if (!data.categories || data.categories.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.madera);
    doc.text('No hay datos de categorías', margin, y);
  } else {
    data.categories.forEach((cat, i) => {
      // Círculo semáforo
      let circleColor: string;
      let desc: string;
      const mp = cat.margin_pct || 0;

      if (mp > 60) {
        circleColor = COLORS.verde;
        desc = 'Líder en margen';
      } else if (mp > 40) {
        circleColor = COLORS.amarillo;
        desc = `Bajo presión, ${fmtNum(cat.count)} productos`;
      } else {
        circleColor = COLORS.rojo;
        desc = `Zona de riesgo, ${fmtNum(cat.count)} productos`;
      }

      doc.setFillColor(circleColor);
      doc.ellipse(margin + 3, y + 3, 3, 3, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.chocolate);
      doc.text(`${cat.categoria} ${fmtPct(mp)}`, margin + 9, y + 4.5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.madera);
      doc.text(`→ ${desc}`, margin + 9 + doc.getTextWidth(`${cat.categoria} ${fmtPct(mp)} `), y + 4.5);

      y += 14;
    });
  }

  y += 10;

  // Nota al pie
  const productosSinVentas = (data.marginKPIs?.total_productos || 0) -
    (data.importan?.length || 0) - (data.drenan?.length || 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(COLORS.madera);
  doc.text(
    `${fmtNum(data.categories?.length || 0)} macrocategorías operacionales. ` +
    `${fmtNum(Math.max(0, productosSinVentas))} productos con receta sin ventas = ruido (excluidos).`,
    margin, y, { maxWidth: pageW - margin * 2 }
  );

  drawWatermark(doc, pageW, pageH);
}
