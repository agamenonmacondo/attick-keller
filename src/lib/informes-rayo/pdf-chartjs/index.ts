/**
 * Entry point: generatePDF(data) → Promise<Blob>
 * PDF vectorial puro con jsPDF (sin Chart.js, sin html2canvas)
 */

import { jsPDF } from 'jspdf';
import { AllData } from './types';
import { renderPortada } from './slides/01-portada';
import { renderKPIs } from './slides/02-kpis';
import { renderZonas } from './slides/03-zonas';
import { renderPagos } from './slides/04-pagos';
import { renderRentabilidad } from './slides/05-rentabilidad';
import { renderImportan } from './slides/06-importan';
import { renderComposicion } from './slides/07-composicion';
import { renderEstrellasLastre } from './slides/08-estrellas-lastre';
import { renderInsights } from './slides/09-insights';
import { renderJunta } from './slides/10-junta';

export type { AllData, KPIData, ZoneData, PaymentData, MarginKPIs, CategorySummary, ProductMargin, LLMAnalysis } from './types';
export type { DailyData as DailyPoint } from './types';

export async function generatePDF(data: AllData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;

  // Slide 1: Portada
  renderPortada(doc, data, pageW, pageH);

  // Slide 2: KPIs
  doc.addPage();
  await renderKPIs(doc, data, pageW, pageH);

  // Slide 3: Zonas
  doc.addPage();
  renderZonas(doc, data, pageW, pageH);

  // Slide 4: Métodos de Pago
  doc.addPage();
  renderPagos(doc, data, pageW, pageH);

  // Slide 5: Rentabilidad
  doc.addPage();
  renderRentabilidad(doc, data, pageW, pageH);

  // Slide 6: Lo que importa
  doc.addPage();
  renderImportan(doc, data, pageW, pageH);

  // Slide 7: Composición por categoría
  doc.addPage();
  renderComposicion(doc, data, pageW, pageH);

  // Slide 8: Estrellas vs Lastre
  doc.addPage();
  renderEstrellasLastre(doc, data, pageW, pageH);

  // Slide 9: Insights
  doc.addPage();
  renderInsights(doc, data, pageW, pageH);

  // Slide 10: Para la Junta
  doc.addPage();
  renderJunta(doc, data, pageW, pageH);

  return doc.output('blob');
}
