/**
 * SLIDE 3 — ZONAS
 * Barras horizontales por zona
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtMoney, fmtNum, drawHeader, drawWatermark } from '../helpers';
import { drawHorizontalBars } from '../charts';
import { AllData } from '../types';

export function renderZonas(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  // Fondo crema
  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Header
  let y = drawHeader(doc, 'RENDIMIENTO POR ZONA', `${data.zones?.length || 0} zonas activas`, pageW, margin);
  y += 8;

  if (!data.zones || data.zones.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(COLORS.madera);
    doc.text('No hay datos de zonas para el período seleccionado', pageW / 2, y + 20, { align: 'center' });
    drawWatermark(doc, pageW, pageH);
    return;
  }

  // Ordenar por revenue descendente
  const sorted = [...data.zones].sort((a, b) => (b.total_ventas || 0) - (a.total_ventas || 0));
  const maxRev = Math.max(...sorted.map((z) => z.total_ventas || 0), 1);

  // Colores por zona
  const zoneColors: Record<string, string> = {
    Barra: COLORS.borgona,
    Terraza: '#D4A843',
    Salon: '#4A7C59',
    'Salón': '#4A7C59',
    VIP: '#722F37',
    General: '#8B7355',
  };

  const items = sorted.map((z) => ({
    label: z.zone || 'Desconocido',
    value: z.total_ventas || 0,
    max: maxRev,
    color: zoneColors[z.zone] || COLORS.dorado,
    suffix: `${fmtMoney(z.total_ventas)} · ${fmtNum(z.total_cheques)} cheques`,
  }));

  // Dibujar barras horizontales
  y = drawHorizontalBars(doc, items, margin, y, pageW - margin * 2, 8, 6);

  y += 10;

  // Tabla resumen
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.chocolate);
  doc.text('RESUMEN', margin, y);
  y += 8;

  sorted.forEach((z) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.chocolate);
    doc.text(z.zone || 'Desconocido', margin, y);

    const pct = maxRev > 0 ? Math.round(((z.total_ventas || 0) / maxRev) * 100) : 0;
    doc.text(`${pct}%`, pageW / 2, y, { align: 'center' });
    doc.text(fmtMoney(z.total_ventas), pageW - margin, y, { align: 'right' });
    y += 6;
  });

  drawWatermark(doc, pageW, pageH);
}
