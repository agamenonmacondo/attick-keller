/**
 * Entry point: generatePDF(data) → Promise<Blob>
 * PDF vectorial puro con jsPDF — Dark Claude Design
 * 8 slides, 520×800px equivalent, Helvetica nativa
 */

import { jsPDF } from 'jspdf'
import { AllData, SlideAnalysisV2 } from './types'
import { renderPortada } from './slides/01-portada'
import { renderMetricas } from './slides/02-metricas'
import { renderDrena } from './slides/03-drena'
import { renderImportan } from './slides/04-importan'
import { renderComposicion } from './slides/05-composicion'
import { renderEstrellasLastre } from './slides/06-estrellas-lastre'
import { renderInsights } from './slides/07-insights'
import { renderJunta } from './slides/08-junta'

export type { AllData } from './types'

interface GeneratorInput {
  data: any        // raw API data (same as v6)
  from: string
  to: string
  margins: any     // margins data
  analysis: SlideAnalysisV2 | null
}

export async function generatePDF(input: GeneratorInput): Promise<Blob> {
  const { data, from, to, margins, analysis } = input

  // Build AllData from v6-compatible inputs
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

  // Slide 1: Portada (borgona)
  renderPortada(doc, allData, pageW, pageH)

  // Slide 2: Métricas clave
  doc.addPage()
  renderMetricas(doc, allData, pageW, pageH)

  // Slide 3: Lo que drena
  doc.addPage()
  renderDrena(doc, allData, pageW, pageH)

  // Slide 4: Lo que importa (Top 7)
  doc.addPage()
  renderImportan(doc, allData, pageW, pageH)

  // Slide 5: Composición del margen
  doc.addPage()
  renderComposicion(doc, allData, pageW, pageH)

  // Slide 6: Estrellas vs Lastre
  doc.addPage()
  renderEstrellasLastre(doc, allData, pageW, pageH)

  // Slide 7: Datos que importan (insights)
  doc.addPage()
  renderInsights(doc, allData, pageW, pageH)

  // Slide 8: Para la junta + mensaje al equipo
  doc.addPage()
  renderJunta(doc, allData, pageW, pageH)

  return doc.output('blob')
}
