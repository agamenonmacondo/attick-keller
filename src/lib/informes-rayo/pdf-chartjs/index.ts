/**
 * Entry point: generatePDF(data) → Promise<Blob>
 * PDF vectorial puro con jsPDF (sin Chart.js, sin html2canvas)
 */

import { jsPDF } from 'jspdf';
import { AllData } from './types';
import { renderPortada } from './slides/01-portada';
import { renderKPIs } from './slides/02-kpis';
import { renderZonas } from './slides/03-zonas';

export type { AllData } from './types';

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

  // TODO: Slides 4-10 se añaden aquí

  return doc.output('blob');
}
