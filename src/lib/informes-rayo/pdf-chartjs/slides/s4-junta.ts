/**
 * SLIDE 4 — Para la junta: 3 jugadas
 * Acciones concretas con responsable y deadline.
 * Felipe lee esto textualmente en la junta.
 */
import { jsPDF } from 'jspdf'
import { AllData } from '../types'
import { COLORS, fmtMoney, fmtPct, drawSlideBg } from '../helpers'

export function renderJunta(doc: jsPDF, data: AllData, pageW: number, pageH: number): void {
  drawSlideBg(doc, pageW, pageH)

  const margin = 20
  let y = 35

  // Header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.gold)
  doc.text('3 JUGADAS', margin, y)
  y += 10

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.textPrimary)
  doc.text('Para la junta', margin, y)
  y += 30

  // Generar 3 jugadas basadas en datos reales
  const jugadas = generarJugadas(data)

  const cardW = pageW - margin * 2
  const cardH = 55

  jugadas.forEach((jugada, i) => {
    // Card background
    doc.setFillColor(COLORS.surface)
    doc.roundedRect(margin, y, cardW, cardH, 4, 4, 'F')

    // Número de jugada
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.goldDark)
    doc.text((i + 1).toString(), margin + 8, y + 26)

    // Título
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.textPrimary)
    doc.text(jugada.titulo, margin + 36, y + 12)

    // Descripción (criollo)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textSecondary)
    const descLines = doc.splitTextToSize(jugada.descripcion, cardW - 54)
    doc.text(descLines, margin + 36, y + 22)

    // Footer: responsable + deadline
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.gold)
    doc.text('Responsable: ' + jugada.responsable, margin + 36, y + 42)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text(' · Deadline: ' + jugada.deadline, margin + 36 + 58, y + 42)

    y += cardH + 12
  })

  // Mensaje del equipo (IA) si existe
  const mensaje = data.analysis?.slide_junta_mensaje || ''
  if (mensaje && y < pageH - 50) {
    y += 10
    doc.setFillColor(COLORS.borgona)
    doc.roundedRect(margin, y, cardW, 1, 0.5, 0.5, 'F')
    y += 10

    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(COLORS.goldLight)
    const msgLines = doc.splitTextToSize('"' + mensaje + '"', cardW - 10)
    doc.text(msgLines, margin + 5, y)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textMuted)
    doc.text('— Rayo', margin + 5, y + msgLines.length * 6 + 4)
  }
}

interface Jugada {
  titulo: string
  descripcion: string
  responsable: string
  deadline: string
}

function generarJugadas(data: AllData): Jugada[] {
  const jugadas: Jugada[] = []

  // Jugada 1: Productos bajo la meta de margen
  const todasLasMargenes = data.todos || []
  const bajoMeta = todasLasMargenes
    .filter(p => p.margin_pct < 30 && (p.quantity_sold || 0) > 5)
    .sort((a, b) => a.margin_pct - b.margin_pct)

  if (bajoMeta.length > 0) {
    const top = bajoMeta.slice(0, 2).map(p => p.product_name).join(' y ')
    const peor = bajoMeta[0]
    jugadas.push({
      titulo: 'RECETAS',
      descripcion: 'Revisar ' + top + '. Margen por debajo del ' + fmtPct(peor.margin_pct) + '. Ajustar ingredientes o precio de venta para llevarlos al 30%.',
      responsable: 'Chef',
      deadline: 'Viernes',
    })
  } else {
    jugadas.push({
      titulo: 'RECETAS',
      descripcion: 'Todos los productos activos están por encima del 30% de margen. Mantener supervisión mensual.',
      responsable: 'Chef',
      deadline: 'Próximo mes',
    })
  }

  // Jugada 2: Impulsar los que más margen dejan
  const topMargen = data.importan.slice(0, 2)
  if (topMargen.length > 0) {
    const nombres = topMargen.map(p => p.product_name).join(' y ')
    jugadas.push({
      titulo: 'IMPULSAR',
      descripcion: nombres + ' tienen margen >' + fmtPct(Math.min(...topMargen.map(p => p.margin_pct))) + '. Sugerir en todas las mesas hoy. Son los que más plata dejan.',
      responsable: 'Capitanes',
      deadline: 'Hoy',
    })
  }

  // Jugada 3: Basada en datos operativos (cheques bajos, revenue débil)
  const kpis = data.kpis
  const catMasDebil = (data.categories || [])
    .sort((a, b) => a.margin_pct - b.margin_pct)[0]

  if (catMasDebil && catMasDebil.margin_pct < 60) {
    jugadas.push({
      titulo: 'REVISAR',
      descripcion: 'La categoría ' + catMasDebil.categoria + ' tiene el margen más bajo (' + fmtPct(catMasDebil.margin_pct) + '). Analizar si hay productos que están jalando el promedio hacia abajo o si es estructural.',
      responsable: 'Felipe',
      deadline: 'Próxima junta',
    })
  } else if (kpis.total_cheques < 50) {
    jugadas.push({
      titulo: 'TRÁFICO',
      descripcion: 'Solo ' + kpis.total_cheques + ' cheques en el período. Evaluar si necesitamos promociones de tráfico o eventos para atraer mesas.',
      responsable: 'Felipe',
      deadline: 'Próxima junta',
    })
  } else {
    jugadas.push({
      titulo: 'SOSTENER',
      descripcion: 'Margen general ' + fmtPct(data.marginKPIs.margin_pct) + ' con ' + data.marginKPIs.total_productos + ' productos activos. Sostener la operación actual. Revisar en 15 días.',
      responsable: 'Felipe',
      deadline: 'Próxima junta',
    })
  }

  return jugadas
}
