/**
 * Charts puros con jsPDF (sin Chart.js, sin canvas)
 * Dibuja barras, donuts y sparklines con primitivas de jsPDF
 */

/**
 * Dibuja barras horizontales con jsPDF
 * @param doc - jsPDF instance
 * @param items - array de { label, value, max, color }
 * @param x, y - posición inicial
 * @param w, h - ancho total del chart, altura por barra
 * @param barH - altura de cada barra
 * @param gap - espacio entre barras
 */
export function drawHorizontalBars(
  doc: any,
  items: { label: string; value: number; max: number; color: string; suffix?: string }[],
  x: number,
  y: number,
  w: number,
  barH: number = 8,
  gap: number = 4
): number {
  let currentY = y;
  const labelW = 40; // mm para label
  const barW = w - labelW - 30; // mm para barra

  items.forEach((item) => {
    // Label
    doc.setFontSize(9);
    doc.setTextColor('#2D1810');
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, x, currentY + 5);

    // Barra bg
    doc.setFillColor('#FFFFFF');
    doc.rect(x + labelW, currentY, barW, barH, 'F');

    // Barra fill
    const pct = item.max > 0 ? Math.min((item.value / item.max) * 100, 100) : 0;
    doc.setFillColor(item.color);
    doc.rect(x + labelW, currentY, barW * (pct / 100), barH, 'F');

    // Valor a la derecha
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const valText = item.suffix || `${Math.round(pct)}%`;
    doc.text(valText, x + labelW + barW + 2, currentY + 5);

    currentY += barH + gap;
  });

  return currentY;
}

/**
 * Dibuja un donut chart con jsPDF
 * @param doc - jsPDF instance
 * @param values - array de valores
 * @param colors - array de colores
 * @param centerText - texto en el centro
 * @param x, y, r - posición y radio
 */
export function drawDonut(
  doc: any,
  values: number[],
  colors: string[],
  centerText: string,
  x: number,
  y: number,
  r: number = 35
): void {
  const total = values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;
  const innerR = r * 0.55;

  // Dibujar segmentos
  values.forEach((val, i) => {
    if (val <= 0) return;
    const angle = (val / total) * Math.PI * 2;
    const endAngle = startAngle + angle;

    // Segmento exterior
    doc.setFillColor(colors[i % colors.length]);
    // Usar doc.ellipse para arcos (aproximación con sectores)
    // jsPDF no tiene arc nativo, usamos path con líneas radiales
    const cx = x;
    const cy = y;
    const steps = Math.max(8, Math.floor(angle * 20));

    for (let j = 0; j < steps; j++) {
      const a1 = startAngle + (angle * j) / steps;
      const a2 = startAngle + (angle * (j + 1)) / steps;
      const path = [
        ['M', cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR],
        ['L', cx + Math.cos(a1) * r, cy + Math.sin(a1) * r],
        ['L', cx + Math.cos(a2) * r, cy + Math.sin(a2) * r],
        ['L', cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR],
        ['Z'],
      ];
      doc.path(path, 'F');
    }

    startAngle = endAngle;
  });

  // Centro blanco (para efecto donut)
  const cx = x;
  const cy = y;
  doc.setFillColor('#FFFFFF');
  doc.ellipse(cx, cy, innerR, innerR, 'F');

  // Texto central
  doc.setFontSize(10);
  doc.setTextColor('#2D1810');
  doc.setFont('helvetica', 'bold');
  const lines = centerText.split('\n');
  lines.forEach((line, i) => {
    doc.text(line, cx, cy - (lines.length - 1) * 3 + i * 6, { align: 'center' });
  });
}

/**
 * Dibuja sparkline (línea mini) con jsPDF
 * @param doc - jsPDF instance
 * @param data - array de valores numéricos
 * @param color - color de la línea
 * @param x, y, w, h - posición y dimensiones
 */
export function drawSparkline(
  doc: any,
  data: number[],
  color: string,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (data.length < 2) return;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);

  doc.setDrawColor(color);
  doc.setLineWidth(0.5);

  // Línea
  doc.lines(
    data.slice(1).map((val, i) => {
      const x1 = x + i * stepX;
      const y1 = y + h - ((data[i] - min) / range) * h;
      const x2 = x + (i + 1) * stepX;
      const y2 = y + h - ((val - min) / range) * h;
      return [x2 - x1, y2 - y1];
    }),
    x,
    y + h - ((data[0] - min) / range) * h
  );

  // Área bajo la curva (simplificada: rectángulos)
  doc.setFillColor(color + '30');
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = x + i * stepX;
    const y1 = y + h - ((data[i] - min) / range) * h;
    const x2 = x + (i + 1) * stepX;
    const y2 = y + h - ((data[i + 1] - min) / range) * h;
    const path = [
      ['M', x1, y + h],
      ['L', x1, y1],
      ['L', x2, y2],
      ['L', x2, y + h],
      ['Z'],
    ];
    doc.path(path, 'F');
  }
}

/**
 * Dibuja barra de progreso horizontal simple
 * @param doc - jsPDF instance
 * @param x, y, w, h - posición y dimensiones
 * @param pct - porcentaje 0-100
 * @param fillColor - color de relleno
 * @param bgColor - color de fondo
 */
export function drawProgressBar(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  fillColor: string,
  bgColor: string = '#FFFFFF'
): void {
  // Background
  doc.setFillColor(bgColor);
  doc.rect(x, y, w, h, 'F');
  // Fill
  if (pct > 0) {
    doc.setFillColor(fillColor);
    doc.rect(x, y, w * Math.min(pct / 100, 1), h, 'F');
  }
}

/**
 * Dibuja una línea semáforo (🟢🟡🔴)
 * @param doc - jsPDF instance
 * @param x, y - posición
 * @param color - 'verde' | 'amarillo' | 'rojo'
 * @param label - texto a la derecha del círculo
 */
export function drawSemaforo(
  doc: any,
  x: number,
  y: number,
  color: 'verde' | 'amarillo' | 'rojo',
  label: string
): void {
  const colorMap = {
    verde: '#4A7C59',
    amarillo: '#D4A843',
    rojo: '#B23A3A',
  };
  const c = colorMap[color];

  // Círculo (dibujar como elipse pequeña)
  doc.setFillColor(c);
  doc.ellipse(x + 2, y, 2.5, 2.5, 'F');

  // Texto
  doc.setFontSize(9);
  doc.setTextColor('#2D1810');
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 7, y + 1);
}
