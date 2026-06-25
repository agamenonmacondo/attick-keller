/**
 * SLIDE 9 — INSIGHTS LLM
 * Análisis generado por LLM o reglas locales
 */

import { jsPDF } from 'jspdf';
import { COLORS, fmtPct, fmtNum, fmtMoney, drawHeader, drawWatermark } from '../helpers';
import { AllData } from '../types';

export function renderInsights(
  doc: jsPDF,
  data: AllData,
  pageW: number,
  pageH: number
): void {
  const margin = 20;

  doc.setFillColor(COLORS.crema);
  doc.rect(0, 0, pageW, pageH, 'F');

  let y = drawHeader(doc, 'INTELIGENCIA OPERATIVA', '', null, pageW, margin, 24);
  y += 10;

  const maxW = pageW - margin * 2 - 10;

  // Build bullets from analysis insights, or fallback to data rules
  const bullets: string[] = [];

  if (data.analysis?.slide_7_insights?.length) {
    data.analysis.slide_7_insights.forEach((b: string) => bullets.push(b));
  } else if (data.analysis?.slide_7_bullets?.length) {
    data.analysis.slide_7_bullets.forEach((b) => bullets.push(b.body));
  } else {
    // Fallback basado en reglas
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.madera);
    doc.text('Análisis basado en reglas locales. Verificar con datos reales.', margin, y);
    y += 8;

    if (data.marginKPIs) {
      bullets.push(`MARGEN GENERAL: ${fmtPct(data.marginKPIs.margin_pct)}`);
    }

    if (data.categories && data.categories.length > 0) {
      const lider = [...data.categories].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))[0];
      bullets.push(`CATEGORÍA LÍDER: ${lider.categoria} con ${fmtPct(lider.margin_pct || 0)} de margen`);
    }

    if (data.importan && data.importan.length > 0) {
      bullets.push(`PRODUCTO ESTRELLA: ${data.importan[0].product_name} · ${fmtMoney(data.importan[0].revenue)}`);
    }

    if (data.drenan && data.drenan.length > 0) {
      bullets.push(`ATENCIÓN: ${fmtNum(data.drenan.length)} productos en zona de riesgo`);
    }
  }

  bullets.slice(0, 6).forEach((bullet: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.dorado);
    doc.text('•', margin, y);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.chocolate);
    doc.text(bullet.trim().replace(/^[•\-\s]+/, ''), margin + 6, y, { maxWidth: maxW });

    y += 9;
  });

  drawWatermark(doc, pageW, pageH);
}
