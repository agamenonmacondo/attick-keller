/**
 * Helpers: colores, formato numérico, layout utils para PDF
 */

export const COLORS = {
  borgona: '#6B2737',
  dorado: '#C9A94E',
  crema: '#F5EDE0',
  madera: '#5C4037',
  chocolate: '#2D1810',
  blanco: '#FFFFFF',
  verde: '#4A7C59',
  amarillo: '#D4A843',
  rojo: '#B23A3A',
  gris: '#8B7355',
};

export const CAT_COLORS: Record<string, string> = {
  COCTELES: '#C9A94E',
  LICORES: '#8B4513',
  VINOS: '#722F37',
  COMIDA: '#4A7C59',
  BEBIDAS: '#4A7C6F',
};

/** Formatea dinero: $791.2M, $12.5K, $450 */
export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

/** Formatea número con separadores de miles */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
}

/** Formatea porcentaje: 72.8% */
export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Rango de fechas: "1–31 Mayo 2026" */
export function fmtDateRange(from: string, to: string): string {
  const d1 = new Date(from + 'T00:00:00');
  const d2 = new Date(to + 'T00:00:00');
  const meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
    return `${d1.getDate()}–${d2.getDate()} ${meses[d1.getMonth()]} ${d1.getFullYear()}`;
  }
  return `${d1.getDate()} ${meses[d1.getMonth()]} – ${d2.getDate()} ${meses[d2.getMonth()]} ${d2.getFullYear()}`;
}

/** Calcula delta porcentual entre actual y anterior */
export function calcDelta(current: number, previous: number): { value: number; isPositive: boolean } {
  if (!previous || previous === 0) return { value: 0, isPositive: true };
  const delta = ((current - previous) / previous) * 100;
  return { value: Math.abs(delta), isPositive: delta >= 0 };
}

/** Dibuja un rectángulo redondeado en jsPDF */
export function roundRect(
  doc: any,
  x: number, y: number, w: number, h: number, r: number,
  style: 'F' | 'S' | 'DF' = 'DF'
): void {
  const radius = Math.min(r, w / 2, h / 2);
  doc.roundedRect(x, y, w, h, radius, radius, style);
}

/** Dibuja una barra horizontal simple (no Chart.js) */
export function drawBar(
  doc: any,
  x: number, y: number, w: number, h: number,
  fillPct: number, fillColor: string, bgColor: string = COLORS.blanco
): void {
  // Background
  doc.setFillColor(bgColor);
  doc.rect(x, y, w, h, 'F');
  // Fill
  if (fillPct > 0) {
    doc.setFillColor(fillColor);
    doc.rect(x, y, w * Math.min(fillPct / 100, 1), h, 'F');
  }
}

/** Dibuja watermark en footer */
export function drawWatermark(doc: any, pageW: number, pageH: number): void {
  doc.setFontSize(8);
  doc.setTextColor(COLORS.madera);
  doc.setFont('helvetica', 'normal');
  doc.text('A&K · Confidencial', pageW / 2, pageH - 8, { align: 'center' });
}

/** Header estándar para slides */
export function drawHeader(
  doc: any,
  title: string,
  subtitle: string,
  pageW: number,
  margin: number
): number {
  const y = margin;
  // Barra borgona
  doc.setFillColor(COLORS.borgona);
  doc.rect(margin, y, pageW - margin * 2, 10, 'F');
  // Título en blanco
  doc.setTextColor(COLORS.blanco);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), margin + 4, y + 7);
  // Subtítulo a la derecha
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, pageW - margin - 4, y + 7, { align: 'right' });
  }
  return y + 14; // y donde empieza el contenido
}

/** Trunca texto con ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
