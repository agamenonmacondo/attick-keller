/**
 * Entry point: generatePDF(data) → Promise<Blob>
 * PDF vectorial puro con jsPDF — Dark Claude Design
 * 4 slides ejecutivas: Portada → Quién puso la plata → Bajo la meta → Para la junta
 * Diseñado para Felipe: 90 segundos de lectura, decisiones claras.
 */
import { jsPDF } from 'jspdf'
import { AllData, SlideAnalysisV2 } from './types'
import { renderPortada } from './slides/s1-portada'
import { renderQuienPuso } from './slides/s2-quien-puso'
import { renderBajoMeta } from './slides/s3-bajo-meta'
import { renderJunta } from './slides/s4-junta'

export type { AllData } from './types'

interface GeneratorInput {
  data: any
  from: string
  to: string
  margins: any
  analysis: SlideAnalysisV2 | null
}

export async function generatePDF(input: GeneratorInput): Promise<Blob> {
  const { data, from, to, margins, analysis } = input

  const allData: AllData = {
    from,
    to,
    kpis: {
      total_ventas: data?.kpis?.total_ventas ?? 0,
      total_cheques: data?.kpis?.total_cheques ?? 0,
      ticket_promedio: data?.kpis?.ticket_promedio ?? 0,
      propina_total: data?.kpis?.propina_total ?? 0,
      personas: data?.kpis?.personas ?? 0,
      propina_promedio: data?.kpis?.propina_promedio ?? 0,
      avg_service_time: data?.kpis?.avg_service_time ?? 0,
      card_paid: data?.kpis?.card_paid ?? 0,
      cash_paid: data?.kpis?.cash_paid ?? 0,
    },
    marginKPIs: {
      total_revenue: margins?.kpis?.total_revenue ?? 0,
      margin_bruto: margins?.kpis?.margin_bruto ?? 0,
      margin_pct: margins?.kpis?.margin_pct ?? 0,
      total_productos: margins?.kpis?.total_productos ?? 0,
    },
    categories: margins?.resumen_ejecutivo?.categorias ?? [],
    importan: margins?.importan ?? [],
    drenan: margins?.drenan ?? [],
    todos: margins?.todos ?? [],
    analysis,
    zones: data?.zones ?? [],
    payments: data?.payments ?? [],
    topProducts: data?.topProducts ?? [],
    daily: data?.daily ?? [],
    comparison: data?.comparison ?? null,
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = 210
  const pageH = 297

  // Slide 1: Portada Ejecutiva — Número grande + KPIs + headline
  renderPortada(doc, allData, pageW, pageH)

  // Slide 2: ¿Quién puso la plata? — Top 7 por margen bruto
  doc.addPage()
  renderQuienPuso(doc, allData, pageW, pageH)

  // Slide 3: ¿Qué está bajo la meta? — Productos con margen < 30% y ventas reales
  doc.addPage()
  renderBajoMeta(doc, allData, pageW, pageH)

  // Slide 4: Para la junta — 3 jugadas accionables
  doc.addPage()
  renderJunta(doc, allData, pageW, pageH)

  return doc.output('blob')
}
