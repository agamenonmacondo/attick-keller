// ═══ A&K Informes Rayo — PDF Generator v5 ═══
// Template: Frank Dark (fondo #0D0D0C, dorado #C9A94E)
// Análisis LLM como columna vertebral — cada slide nutrido por IA
// 11 slides, 450x800px cada uno, html2canvas + jsPDF

import { SlideAnalysisV2 } from './analysis-pipeline-v2'

// ── Types ──
interface KpiData {
  total_ventas?: number
  total_cheques?: number
  propina_total?: number
  personas?: number
  ticket_promedio?: number
  propina_promedio?: number
  personas_promedio?: number
}

interface ZoneData {
  zone?: string
  derived_zone_name?: string
  total_ventas?: number
  revenue?: number
  total_cheques?: number
  personas?: number
  cheques?: number
}

interface PaymentData {
  payment_method?: string
  metodo?: string
  method?: string
  total?: number
  amount?: number
  cheques?: number
  count?: number
  pct?: number
  total_ventas?: number
}

interface ProductData {
  product_name?: string
  category_name?: string
  quantity?: number
  revenue?: number
}

interface ComparisonData {
  kpis: KpiData | null
}

interface ReportData {
  kpis: KpiData
  zones: ZoneData[]
  payments: PaymentData[]
  topProducts: ProductData[]
  comparison?: ComparisonData | null
}

interface MarginCategory {
  categoria: string
  revenue: number
  margin_pct: number
  importan: number
  drenan: number
  count: number
}

interface MarginProduct {
  product_name: string
  macro_category: string
  margin_pct: number
  revenue: number
  margin_bruto: number
  quantity_sold?: number
  diagnostico?: string
}

interface MarginsData {
  kpis: {
    total_revenue: number
    margin_bruto: number
    margin_pct: number
    total_productos: number
  }
  resumen_ejecutivo: {
    categorias: MarginCategory[]
  }
  importan: MarginProduct[]
  drenan: MarginProduct[]
}

interface PDFGeneratorInput {
  data: ReportData
  from: string
  to: string
  analysis: SlideAnalysisV2 | null
  margins?: MarginsData | null
}

// ── Formatters ──
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K'
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

function pct(a: number, b: number): string {
  if (!b || b === 0) return ''
  const d = ((a - b) / b) * 100
  return (d >= 0 ? '+' : '') + d.toFixed(1) + '%'
}

function formatDateEs(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

// ── Category helpers ──
function catColor(cat: string): string {
  const u = cat.toUpperCase()
  if (u.includes('COCTEL')) return '#C9A94E'
  if (u.includes('LICOR')) return '#E8D48B'
  if (u.includes('VINO')) return '#A0522D'
  if (u.includes('COMID')) return '#5D1528'
  if (u.includes('BEBID')) return '#4ADE80'
  return '#706860'
}

function semaforo(pctValue: number, meta: number = 30): string {
  if (pctValue >= 50) return '<span style="color:#4ADE80;font-size:14px">◉</span>'
  if (pctValue >= meta) return '<span style="color:#FACC15;font-size:14px">◐</span>'
  return '<span style="color:#EF4444;font-size:14px">○</span>'
}

function emptySlide(title: string): string {
  return '<div class="slide"><div class="slide-header"><span class="slide-hdr-title">' + title + '</span></div><div class="empty-state"><div class="empty-msg">Sin datos de rentabilidad para este período</div></div><div class="watermark">A&K · Confidencial</div></div>'
}

// ── Phosphor icon SVGs (inline, no external deps) ──
const ICONS: Record<string, string> = {
  Lightning: '<svg width="16" height="16" viewBox="0 0 256 256" fill="#C9A94E"><path d="M213.85 125.28l-80-96A8 8 0 0 0 120 40v56H48a8 8 0 0 0-5.85 13.28l80 96A8 8 0 0 0 136 200v-56h72a8 8 0 0 0 5.85-13.28z"/></svg>',
  TrendUp: '<svg width="16" height="16" viewBox="0 0 256 256" fill="#4ADE80"><path d="M232 56v64a8 8 0 0 1-8 8h-64a8 8 0 0 1 0-16h44.7L136 115.3l-34.3-34.3a8 8 0 0 0-11.4 0l-56 56a8 8 0 0 0 11.4 11.4L96 108.7l34.3 34.3a8 8 0 0 0 11.4 0L216 76.7V120a8 8 0 0 1 16 0V56a8 8 0 0 0-8-8z"/></svg>',
  TrendDown: '<svg width="16" height="16" viewBox="0 0 256 256" fill="#EF4444"><path d="M232 200v-64a8 8 0 0 0-8-8h-64a8 8 0 0 0 0 16h44.7L136 140.7l-34.3 34.3a8 8 0 0 1-11.4 0l-56-56a8 8 0 0 1 11.4-11.4L96 159.3l34.3-34.3a8 8 0 0 1 11.4 0L208 179.3V144a8 8 0 0 1 16 0v56a8 8 0 0 1-8 8H56a8 8 0 0 1 0-16z"/></svg>',
  Warning: '<svg width="16" height="16" viewBox="0 0 256 256" fill="#FACC15"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24zm0 144a12 12 0 1 1 12-12 12 12 0 0 1-12 12zm12-52a12 12 0 0 1-24 0V88a12 12 0 0 1 24 0z"/></svg>',
  CheckCircle: '<svg width="16" height="16" viewBox="0 0 256 256" fill="#4ADE80"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24zm45.66 85.66l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32z"/></svg>',
}

// ── Parse analysis sections (for slide 9) ──
function parseAnalysisSections(text: string): { icon: string; title: string; body: string }[] {
  const sections: { icon: string; title: string; body: string }[] = []
  const lines = text.split('\n')
  let currentSection: { icon: string; title: string; body: string } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (currentSection) {
        sections.push(currentSection)
        currentSection = null
      }
      continue
    }
    const headerMatch = trimmed.match(/^([⚡📈📉💡📋⚠️🏆📊])\s*\*\*(.+?)\*\*/)
    if (headerMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { icon: headerMatch[1], title: headerMatch[2], body: '' }
      continue
    }
    if (currentSection) {
      currentSection.body += (currentSection.body ? '\n' : '') + trimmed.replace(/\*\*/g, '')
    }
  }
  if (currentSection) sections.push(currentSection)
  return sections
}

// ═══════════════════════════════════════════════════════════════
// CSS — Frank Dark v5 (extracted from inline, organized by component)
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Caveat:wght@500;600&display=swap");

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"DM Sans",sans-serif;background:#0D0D0C;color:#F0EDE8;line-height:1.4;-webkit-font-smoothing:antialiased;width:450px}

/* ── Slide base ── */
.slide{width:450px;height:800px;overflow:hidden;position:relative;background:#0D0D0C;padding:0 32px;display:flex;flex-direction:column}
.slide-cover{background:#0D0D0C;justify-content:space-between;padding:44px 36px 36px;color:#F0EDE8}

/* ── Header ── */
.slide-header{margin:0 -32px;padding:20px 32px 14px;flex-shrink:0}
.slide-label{font-family:"DM Sans",sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#A09890;margin-bottom:4px}
.slide-title{font-family:"Playfair Display",serif;font-size:26px;font-weight:700;color:#F0EDE8;line-height:1.15;letter-spacing:-0.01em}

/* ── Editorial headline (v5: LLM as backbone) ── */
.slide-headline{font-family:"DM Sans",sans-serif;font-size:13px;font-weight:500;color:#C9A94E;line-height:1.4;margin:6px 0 16px;padding:10px 14px;background:rgba(201,169,78,0.06);border-radius:8px;border-left:3px solid #C9A94E}

/* ── Watermark ── */
.watermark{position:absolute;bottom:14px;right:22px;font-family:"DM Sans",sans-serif;font-size:9px;color:rgba(240,237,232,0.06);font-weight:700;letter-spacing:0.15em;text-transform:uppercase;pointer-events:none}

/* ── Empty state ── */
.empty-state{flex:1;display:flex;align-items:center;justify-content:center}
.empty-msg{font-family:"DM Sans",sans-serif;font-size:14px;color:#A09890;text-align:center;padding:0 32px}

/* ── Metrics grid (slide 2) ── */
.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
.metric-card{background:#141414;border-radius:10px;padding:16px 12px;border:1px solid rgba(201,169,78,0.08)}
.metric-value{font-family:"Playfair Display",serif;font-size:24px;font-weight:700;color:#C9A94E;line-height:1}
.metric-delta{font-size:9px;color:#4ADE80;font-weight:600;margin-top:4px;font-family:"DM Sans",sans-serif}
.metric-name{font-size:9px;color:#A09890;margin-top:4px;font-family:"DM Sans",sans-serif}

/* ── Insight card (v5: slide 7) ── */
.insight-card{display:flex;gap:12px;padding:12px;margin-bottom:10px;background:#141414;border-radius:8px;border:1px solid rgba(201,169,78,0.06);align-items:flex-start}
.insight-icon{flex-shrink:0;margin-top:2px}
.insight-body{flex:1;min-width:0}
.insight-title{font-size:11px;font-weight:700;color:#C9A94E;font-family:"DM Sans",sans-serif;margin-bottom:2px}
.insight-text{font-size:10px;line-height:1.45;color:#E0D8CC;font-family:"DM Sans",sans-serif}

/* ── Junta card (v5: slide 8) ── */
.junta-card{background:#141414;border-radius:10px;padding:16px;margin-bottom:12px;display:flex;gap:14px;align-items:flex-start}
.junta-emoji{font-size:26px;flex-shrink:0;line-height:1}
.junta-content{flex:1;min-width:0}
.junta-title{font-size:12px;font-weight:700;color:#F0EDE8;font-family:"DM Sans",sans-serif;letter-spacing:0.05em;margin-bottom:4px}
.junta-action{font-size:11px;line-height:1.45;color:#E0D8CC;font-family:"DM Sans",sans-serif}
.junta-metric{font-family:"Playfair Display",serif;font-size:18px;font-weight:700;color:#C9A94E;margin-top:6px;line-height:1}

/* ── Cover ── */
.cover-top{display:flex;justify-content:space-between;align-items:flex-start}
.cover-logo{font-family:"Playfair Display",serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C9A94E}
.cover-date{font-family:"DM Sans",sans-serif;font-size:11px;color:rgba(240,237,232,0.35);font-weight:400}
.cover-main{margin-top:auto;margin-bottom:auto}
.cover-script{font-family:"Caveat",cursive;font-size:32px;color:#C9A94E;margin-bottom:10px;line-height:1.15;font-weight:500}
.cover-title{font-family:"Playfair Display",serif;font-size:42px;font-weight:900;color:#F0EDE8;line-height:1.05;margin-bottom:18px;letter-spacing:-0.02em}
.cover-sub{font-family:"DM Sans",sans-serif;font-size:13px;color:rgba(240,237,232,0.55);line-height:1.55;max-width:300px;font-weight:400}
.cover-footer{border-top:1px solid rgba(201,169,78,0.2);padding-top:18px;display:flex;justify-content:space-between;align-items:center}
.cover-period{font-family:"DM Sans",sans-serif;font-size:11px;color:#C9A94E;font-weight:500}
.cover-page{font-family:"DM Sans",sans-serif;font-size:11px;color:rgba(240,237,232,0.25)}

/* ── Analysis block (v5: slide 9) ── */
.analysis-block{background:#141414;border-radius:8px;padding:12px 14px;margin-bottom:10px}
.analysis-block-header{font-size:10px;font-weight:700;color:#F0EDE8;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.analysis-block-body{font-size:10px;line-height:1.5;color:#E0D8CC;font-family:"DM Sans",sans-serif}

/* ── Footer ── */
.slide-footer{margin-top:auto;padding-top:12px;border-top:1px solid rgba(201,169,78,0.1);text-align:center}
.slide-footer-text{font-size:9px;color:#A09890;letter-spacing:0.1em;text-transform:uppercase;font-family:"DM Sans",sans-serif}
`

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR v5 — Frank Dark + Analysis as backbone
// ═══════════════════════════════════════════════════════════════
export function generatePDFHtmlV5(input: PDFGeneratorInput): string {
  const { data, from, to, margins, analysis } = input
  const a = analysis

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const hasMargins = !!(margins && margins.kpis && margins.kpis.total_productos > 0)

  // Helper: headline from analysis, fallback to generated
  const headline2 = a?.slide_2_headline || (hasMargins ? 'Margen ' + margins!.kpis.margin_pct.toFixed(1) + '% — Resumen del período' : 'Resumen del período')
  const headline3 = a?.slide_3_headline || (hasMargins ? margins!.drenan.length + ' productos en riesgo' : 'Diagnóstico operativo')
  const headline5 = a?.slide_5_headline || (hasMargins ? 'Composición del margen por categoría' : 'Estructura de rentabilidad')

  const slides: string[] = []

  // ═══ SLIDE 1 — PORTADA ═══
  slides.push('<div class="slide slide-cover"><div class="cover-top"><div class="cover-logo">Attick &amp; Keller</div><div class="cover-date">' + todayLabel + '</div></div><div class="cover-main"><div class="cover-script">Informe de rentabilidad</div><div class="cover-title">Informe<br>Rayo</div><div class="cover-sub">Análisis operativo de márgenes, productos y decisiones para la junta directiva.</div></div><div class="cover-footer"><div class="cover-period">' + periodLabel + '</div><div class="cover-page">01 / 11</div></div><div class="watermark">A&K · Confidencial</div></div>')

  // ═══ SLIDE 2 — KPIs VITALES + HEADLINE IA ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const analysisText = a?.slide_2_metrics || ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Resumen ejecutivo</div><div class="slide-title">Métricas clave<br>del período</div></div>' +
      '<div class="slide-headline">' + headline2 + '</div>' +
      '<div class="metrics-grid">' +
      '<div class="metric-card"><div class="metric-value">' + fmt(mk.total_revenue) + '</div><div class="metric-delta">' + (mk.total_revenue > 0 ? '↑ vs período anterior' : '—') + '</div><div class="metric-name">Ventas totales</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + mk.margin_pct.toFixed(1) + '%</div><div class="metric-delta">' + semaforo(mk.margin_pct) + ' ' + (mk.margin_pct >= 30 ? 'Sobre meta' : 'Bajo meta') + '</div><div class="metric-name">Margen general</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + fmtN(mk.total_productos) + '</div><div class="metric-delta">con margen calculable</div><div class="metric-name">Productos</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + fmt(mk.margin_bruto) + '</div><div class="metric-delta">ganancia neta total</div><div class="metric-name">Margen bruto</div></div>' +
      '</div>' +
      (analysisText && analysisText !== headline2 ? '<div style="margin-top:12px;font-size:10px;line-height:1.45;color:#E0D8CC;font-family:DM Sans,sans-serif;padding:8px 12px;background:rgba(201,169,78,0.06);border-radius:6px;border-left:3px solid #C9A94E">' + analysisText + '</div>' : '') +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('MÉTRICAS CLAVE')) }

  // ═══ SLIDE 3 — LO QUE DRENA + HEADLINE IA ═══
  if (hasMargins && margins!.drenan.length > 0) {
    const drenaRows = margins!.drenan.slice(0, 5).map(p => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : p.product_name
      const barColor = p.margin_pct < 30 ? '#A0522D' : '#D4922A'
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:8px;height:8px;border-radius:50%;background:' + barColor + ';flex-shrink:0"></div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:#F0EDE8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div><div style="display:flex;align-items:center;gap:6px;margin-top:3px"><div style="flex:1;height:5px;background:#1A1A1A;border-radius:3px;overflow:hidden"><div style="width:' + Math.max(p.margin_pct, 5) + '%;height:100%;background:' + barColor + ';border-radius:3px"></div></div><div style="font-size:9px;color:#A09890">' + Math.round(p.margin_pct) + '% ' + fmt(p.revenue) + '</div></div></div></div>'
    }).join('')
    const analysisText = a?.slide_3_drena || ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Diagnóstico operativo</div><div class="slide-title">Lo que drena<br>el negocio</div></div>' +
      '<div class="slide-headline" style="background:rgba(160,82,45,0.08);border-left-color:#A0522D;color:#D4922A">' + headline3 + '</div>' +
      '<div style="margin-top:4px">' + drenaRows + '</div>' +
      (analysisText && analysisText !== headline3 ? '<div style="margin-top:10px;font-size:10px;line-height:1.45;color:#E0D8CC;font-family:DM Sans,sans-serif;padding:8px 12px;background:rgba(160,82,45,0.08);border-radius:6px;border-left:3px solid #A0522D">' + analysisText + '</div>' : '') +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('LO QUE DRENA')) }

  // ═══ SLIDE 4 — LO QUE IMPORTA + ANÁLISIS ═══
  if (hasMargins && margins!.importan.length > 0) {
    const top7 = margins!.importan.slice(0, 7)
    const maxMarginPct = Math.max(...top7.map(p => p.margin_pct || 0), 1)
    const rows = top7.map((p, i) => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : p.product_name
      const barPct = maxMarginPct > 0 ? (p.margin_pct / maxMarginPct) * 100 : 0
      const barColor = p.margin_pct > 50 ? '#C9A94E' : p.margin_pct > 30 ? '#D4B76A' : '#A0522D'
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:6px 0;border-bottom:1px solid rgba(201,169,78,0.06)"><div style="width:20px;height:20px;border-radius:50%;background:' + barColor + ';color:#0D0D0C;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (i + 1) + '</div><div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:600;color:#F0EDE8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div><div style="margin-top:3px;height:4px;background:#1A1A1A;border-radius:2px;overflow:hidden"><div style="width:' + barPct.toFixed(1) + '%;height:100%;background:' + barColor + ';border-radius:2px"></div></div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:11px;font-weight:700;color:#F0EDE8">' + fmt(p.revenue) + '</div><div style="font-size:8px;color:#A09890">' + Math.round(p.margin_pct) + '%</div></div></div>'
    }).join('')
    const analysisText = a?.slide_4_importan || ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Top performers</div><div class="slide-title">Lo que importa<br>Top 1 — 7</div></div>' +
      (analysisText ? '<div class="slide-headline">' + analysisText + '</div>' : '') +
      '<div style="margin-top:4px">' + rows + '</div>' +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('LO QUE IMPORTA')) }

  // ═══ SLIDE 5 — COMPOSICIÓN + HEADLINE IA ═══
  if (hasMargins && margins!.resumen_ejecutivo.categorias.length > 0) {
    const cats = margins!.resumen_ejecutivo.categorias
    const maxRev = Math.max(...cats.map(c => Number(c.revenue || 0)), 1)
    const catColors: Record<string, string> = { 'BEBIDAS': '#5C7A4D', 'COCTELES': '#6B2737', 'LICORES': '#C9A94E', 'COMIDA': '#A0522D', 'VINOS': '#D4922A' }
    const rows = cats.map(c => {
      const color = catColors[c.categoria.toUpperCase()] || '#6B2737'
      const barW = maxRev > 0 ? (Number(c.revenue || 0) / maxRev) * 100 : 0
      return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:11px;font-weight:600;color:' + color + ';min-width:75px">' + c.categoria + '</span><div style="flex:1;height:20px;background:#1A1A1A;border-radius:4px;overflow:hidden;margin:0 10px"><div style="width:' + barW.toFixed(1) + '%;height:100%;background:' + color + ';border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px"><span style="font-size:9px;color:#0D0D0C;font-weight:700">' + c.margin_pct + '%</span></div></div></div><div style="display:flex;gap:12px;margin-left:85px"><span style="font-size:9px;color:#A09890">Rev: <span style="color:#F0EDE8">' + fmt(c.revenue) + '</span></span><span style="font-size:9px;color:#A09890">SKU: <span style="color:#F0EDE8">' + fmtN(c.count) + '</span></span></div></div>'
    }).join('')
    const analysisText = a?.slide_5_composicion || ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Estructura de rentabilidad</div><div class="slide-title">Composición<br>del margen</div></div>' +
      '<div class="slide-headline" style="background:rgba(92,122,77,0.08);border-left-color:#5C7A4D;color:#8AAE6B">' + headline5 + '</div>' +
      '<div style="margin-top:4px">' + rows + '</div>' +
      (analysisText && analysisText !== headline5 ? '<div style="margin-top:10px;font-size:10px;line-height:1.45;color:#E0D8CC;font-family:DM Sans,sans-serif;padding:8px 12px;background:rgba(92,122,77,0.06);border-radius:6px;border-left:3px solid #5C7A4D">' + analysisText + '</div>' : '') +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('COMPOSICIÓN DEL MARGEN')) }

  // ═══ SLIDE 6 — ESTRELLAS vs LASTRE + ANÁLISIS ═══
  if (hasMargins) {
    const estrellas = [...margins!.importan].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0)).slice(0, 5)
    const lastre = [...margins!.drenan].sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0)).slice(0, 5)
    const maxStarPct = Math.max(...estrellas.map(p => p.margin_pct || 0), 1)
    const maxLastrePct = Math.max(...lastre.map(p => Math.abs(p.margin_pct || 0)), 1)
    const estrellasRows = estrellas.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : p.product_name
      const barW = maxStarPct > 0 ? (p.margin_pct / maxStarPct) * 100 : 0
      return '<div style="padding:7px;margin-bottom:5px;background:#141414;border-radius:6px"><div style="font-size:10px;font-weight:600;color:#F0EDE8;margin-bottom:3px">' + name + '</div><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:4px;background:#1A1A1A;border-radius:2px;overflow:hidden"><div style="width:' + barW.toFixed(1) + '%;height:100%;background:#4ADE80;border-radius:2px"></div></div><div style="font-size:9px;color:#A09890;white-space:nowrap">' + fmt(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%</div></div></div>'
    }).join('')
    const lastreRows = lastre.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : p.product_name
      const barW = maxLastrePct > 0 ? (Math.abs(p.margin_pct) / maxLastrePct) * 100 : 0
      const color = p.margin_pct < 0 ? '#EF4444' : p.margin_pct < 30 ? '#FACC15' : '#4ADE80'
      return '<div style="padding:7px;margin-bottom:5px;background:#141414;border-radius:6px"><div style="font-size:10px;font-weight:600;color:#F0EDE8;margin-bottom:3px">' + name + '</div><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:4px;background:#1A1A1A;border-radius:2px;overflow:hidden"><div style="width:' + barW.toFixed(1) + '%;height:100%;background:' + color + ';border-radius:2px"></div></div><div style="font-size:9px;color:#A09890;white-space:nowrap">' + fmt(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%</div></div></div>'
    }).join('')
    const analysisText = a?.slide_6_estrellas_lastre || ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Dualidad operativa</div><div class="slide-title">Estrellas vs<br>Lastre</div></div>' +
      (analysisText ? '<div class="slide-headline" style="background:rgba(240,237,232,0.03);border-left-color:#F0EDE8;color:#F0EDE8">' + analysisText + '</div>' : '') +
      '<div style="display:flex;gap:12px;margin-top:4px"><div style="flex:1"><div style="font-size:9px;font-weight:700;color:#4ADE80;margin-bottom:6px;letter-spacing:0.05em">ESTRELLAS — Top 5 margen</div>' + estrellasRows + '</div><div style="flex:1"><div style="font-size:9px;font-weight:700;color:#EF4444;margin-bottom:6px;letter-spacing:0.05em">LASTRE — Bottom 5</div>' + lastreRows + '</div></div>' +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('ESTRELLAS vs LASTRE')) }

  // ═══ SLIDE 7 — DATOS QUE IMPORTAN (v5: insight cards con icon + title) ═══
  if (hasMargins) {
    // Use v5 structured bullets if available, fall back to strings
    const bullets = a?.slide_7_bullets && a.slide_7_bullets.length > 0
      ? a.slide_7_bullets
      : a?.slide_7_insights && a.slide_7_insights.length > 0
        ? a.slide_7_insights.map((text, i) => {
            const icons = ['Lightning', 'TrendUp', 'Warning', 'CheckCircle', 'TrendDown']
            return { icon: icons[i] || 'Lightning', title: '', body: text }
          })
        : []

    // Generate fallback bullets from data if no AI
    const fallbackBullets: { icon: string; title: string; body: string }[] = []
    if (bullets.length === 0 && hasMargins) {
      const mk = margins!.kpis
      const cats = margins!.resumen_ejecutivo.categorias
      const topImportan = margins!.importan.length > 0 ? margins!.importan[0] : null
      const bestCat = cats.length > 0 ? [...cats].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0] : null
      const worstCat = cats.length > 0 ? [...cats].sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))[0] : null
      if (topImportan) fallbackBullets.push({ icon: 'Lightning', title: 'Producto estrella', body: '<strong style="color:#C9A94E">' + topImportan.product_name + '</strong> genera ' + fmt(topImportan.margin_bruto) + ' netos' })
      if (bestCat) fallbackBullets.push({ icon: 'TrendUp', title: bestCat.categoria, body: bestCat.margin_pct + '% de margen con ' + fmtN(bestCat.count) + ' productos' })
      if (worstCat && worstCat.categoria !== bestCat?.categoria) fallbackBullets.push({ icon: 'Warning', title: worstCat.categoria, body: 'Solo ' + worstCat.margin_pct + '% margen — categoría más débil' })
      fallbackBullets.push({ icon: 'CheckCircle', title: 'Meta cumplida', body: (mk.margin_pct - 30).toFixed(0) + ' puntos sobre el 30% objetivo' })
    }

    const allBullets = bullets.length > 0 ? bullets : fallbackBullets
    const bulletsHtml = allBullets.slice(0, 5).map(b => {
      const iconSvg = ICONS[b.icon] || ICONS.Lightning
      return '<div class="insight-card"><div class="insight-icon">' + iconSvg + '</div><div class="insight-body">' +
        (b.title ? '<div class="insight-title">' + b.title + '</div>' : '') +
        '<div class="insight-text">' + b.body + '</div></div></div>'
    }).join('')

    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Inteligencia operativa</div><div class="slide-title">Datos que<br>importan</div></div><div style="margin-top:6px">' + bulletsHtml + '</div><div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('DATOS QUE IMPORTAN')) }

  // ═══ SLIDE 8 — PARA LA JUNTA (v5: cards estructuradas con métrica) ═══
  if (hasMargins) {
    // Use v5 structured cards if available, fall back to strings
    const cards = a?.slide_8_cards && a.slide_8_cards.length > 0
      ? a.slide_8_cards
      : a?.slide_8_junta && a.slide_8_junta.length > 0
        ? a.slide_8_junta.map(t => {
            const emoji = t.startsWith('✅') ? '✅' : t.startsWith('⚠') ? '⚠' : '🔥'
            const cleanText = t.replace(/^[✅⚠🔥]\s*/, '')
            return { emoji, title: '', action: cleanText, metric: '' }
          })
        : []

    // Generate fallback cards from data if no AI
    const fallbackCards: { emoji: string; title: string; action: string; metric: string }[] = []
    if (cards.length === 0) {
      const mk = margins!.kpis
      const cats = margins!.resumen_ejecutivo.categorias
      const bestCat = cats.length > 0 ? [...cats].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0] : null
      const drenaCount = margins!.drenan.length
      if (bestCat) fallbackCards.push({ emoji: '✅', title: bestCat.categoria.toUpperCase(), action: 'Mantener precios y duplicar promociones en horas pico', metric: bestCat.margin_pct + '% margen' })
      fallbackCards.push({ emoji: '⚠', title: drenaCount + ' EN RIESGO', action: 'Evaluar menú y ajustar precios de productos del 5% inferior', metric: 'Bottom 5%' })
      fallbackCards.push({ emoji: '🔥', title: 'MARGEN SALUDABLE', action: 'Margen general sobre meta — mantener estrategia actual', metric: mk.margin_pct.toFixed(1) + '% margen' })
    }

    const allCards = cards.length > 0 ? cards : fallbackCards
    const borderColors = ['rgba(74,222,128,0.2)', 'rgba(250,204,21,0.2)', 'rgba(201,169,78,0.2)']
    const cardsHtml = allCards.slice(0, 3).map((c, i) => {
      return '<div class="junta-card" style="border:1px solid ' + borderColors[i] + '"><div class="junta-emoji">' + c.emoji + '</div><div class="junta-content">' +
        (c.title ? '<div class="junta-title">' + c.title + '</div>' : '') +
        '<div class="junta-action">' + c.action + '</div>' +
        (c.metric ? '<div class="junta-metric">' + c.metric + '</div>' : '') +
        '</div></div>'
    }).join('')

    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Recomendaciones</div><div class="slide-title">Para la<br>junta</div></div>' +
      '<div style="margin-top:8px">' + cardsHtml + '</div>' +
      '<div class="slide-footer"><div class="slide-footer-text">Informe generado · Attick &amp; Keller · ' + todayLabel + '</div></div>' +
      '<div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('PARA LA JUNTA')) }

  // ═══ SLIDE 9 — ANÁLISIS IA COMPLETO (v5: color left-border sections) ═══
  if (a?.slide_9_full_analysis && a.slide_9_full_analysis.length > 10) {
    const sections = parseAnalysisSections(a.slide_9_full_analysis)
    if (sections.length > 0) {
      const sectionColors: Record<string, string> = {
        '⚡': '#C9A94E', '📈': '#4ADE80', '📉': '#EF4444', '💡': '#FACC15', '📊': '#4ADE80',
        '📋': '#A09890', '⚠️': '#EF4444', '⚠': '#EF4444', '🏆': '#C9A94E',
      }
      const analysisBlocks = sections.slice(0, 5).map(s => {
        const body = s.body.replace(/\n/g, '<br>')
        const borderColor = sectionColors[s.icon] || '#C9A94E'
        return '<div class="analysis-block" style="border-left:3px solid ' + borderColor + '"><div class="analysis-block-header"><span>' + s.icon + '</span><span><strong>' + s.title + '</strong></span></div><div class="analysis-block-body">' + body + '</div></div>'
      }).join('')
      slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Análisis inteligente</div><div class="slide-title">Análisis<br>Rayo IA</div></div><div style="margin-top:4px;overflow-y:auto;max-height:620px">' + analysisBlocks + '</div><div class="slide-footer"><div class="slide-footer-text">Fuente: Rayo IA · ' + todayLabel + '</div></div><div class="watermark">A&amp;K · Confidencial</div></div>')
    }
  }

  // ═══ SLIDE 10 — RENTABILIDAD RESUMEN (estático) ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const catColors: Record<string, string> = { 'BEBIDAS': '#5C7A4D', 'COCTELES': '#6B2737', 'LICORES': '#C9A94E', 'COMIDA': '#A0522D', 'VINOS': '#D4922A' }
    const catBars = cats.map(c => {
      const color = catColors[c.categoria.toUpperCase()] || '#6B2737'
      return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:10px;font-weight:600;color:' + color + ';min-width:70px">' + c.categoria + '</span><div style="flex:1;height:16px;background:#1A1A1A;border-radius:3px;overflow:hidden;margin:0 8px"><div style="width:' + c.margin_pct + '%;height:100%;background:' + color + ';border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:5px"><span style="font-size:8px;color:#0D0D0C;font-weight:700">' + c.margin_pct + '%</span></div></div></div></div>'
    }).join('')
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Rentabilidad operativa</div><div class="slide-title">Márgenes<br>por categoría</div></div><div style="display:flex;gap:10px;margin-bottom:12px"><div style="flex:1;background:#141414;border-radius:8px;padding:12px;border:1px solid rgba(201,169,78,0.1)"><div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#A09890;margin-bottom:4px">Margen General</div><div style="font-family:Playfair Display,serif;font-size:28px;font-weight:700;color:#C9A94E;line-height:1">' + mk.margin_pct.toFixed(1) + '%</div><div style="font-size:9px;color:#4ADE80;font-weight:600;margin-top:4px">+' + (mk.margin_pct - 30).toFixed(0) + 'pp sobre meta</div></div><div style="flex:1;background:#141414;border-radius:8px;padding:12px;border:1px solid rgba(201,169,78,0.1)"><div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#A09890;margin-bottom:4px">Productos con Receta</div><div style="font-family:Playfair Display,serif;font-size:28px;font-weight:700;color:#C9A94E;line-height:1">' + fmtN(mk.total_productos) + '</div><div style="font-size:9px;color:#A09890;font-weight:500;margin-top:4px">' + fmtN(margins!.importan.length + margins!.drenan.length) + ' con margen real</div></div></div><div style="margin-top:4px">' + catBars + '</div><div style="margin-top:auto;padding-top:10px;border-top:1px solid rgba(201,169,78,0.1)"><div style="font-size:10px;line-height:1.5;color:#A09890"><strong style="color:#F0EDE8">5 macrocategorías operacionales.</strong> ' + fmtN(Math.max(0, margins!.importan.length + margins!.drenan.length - mk.total_productos)) + ' productos con receta sin ventas = ruido (excluidos).</div></div><div class="watermark">A&K · Confidencial</div></div>')
  } else { slides.push(emptySlide('RENTABILIDAD RESUMEN')) }

  // ═══ SLIDE 11 — ZONAS + PAGOS ═══
  if (data.zones && data.zones.length > 0) {
    const totalZoneRev = data.zones.reduce((s: number, z: any) => s + Number(z.total_ventas || z.revenue || 0), 0)
    const zoneRows = data.zones.slice(0, 5).map(z => {
      const zRev = Number(z.total_ventas || z.revenue || 0)
      const zPct = totalZoneRev > 0 ? (zRev / totalZoneRev * 100).toFixed(1) : '0'
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><div style="width:75px;font-size:10px;color:#A09890;flex-shrink:0">' + (z.zone || 'Sin zona') + '</div><div style="flex:1;height:14px;background:#1A1A1A;border-radius:3px;overflow:hidden"><div style="width:' + zPct + '%;height:100%;background:#C9A94E;border-radius:3px"></div></div><div style="font-size:10px;color:#F0EDE8;min-width:55px;text-align:right">' + fmt(zRev) + '</div></div>'
    }).join('')
    const payRows = data.payments && data.payments.length > 0
      ? data.payments.slice(0, 4).map(p => {
          const method = p.payment_method || p.metodo || p.method || 'Otro'
          const total = Number(p.total || p.amount || 0)
          const pPct = p.pct || 0
          return '<div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:10px"><span style="color:#A09890">' + method + '</span><span style="color:#F0EDE8">' + fmt(total) + ' (' + pPct + '%)</span></div>'
        }).join('')
      : ''
    slides.push('<div class="slide"><div class="slide-header"><div class="slide-label">Operativo</div><div class="slide-title">Zonas &amp;<br>Pagos</div></div><div style="margin-top:4px"><div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#A09890;margin-bottom:8px">Ventas por zona</div>' + zoneRows + '</div>' + (payRows ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,169,78,0.1)"><div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#A09890;margin-bottom:8px">Métodos de pago</div>' + payRows + '</div>' : '') + '<div class="watermark">A&K · Confidencial</div></div>')
  }

  // ── Assemble full HTML ──
  const slidesHtml = slides.map((s, i) => {
    return s.replace('class="slide"', 'class="slide" data-index="' + i + '"')
      .replace('class="slide slide-cover"', 'class="slide slide-cover" data-index="' + i + '"')
  }).join('\n')

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body>' + slidesHtml + '</body></html>'
}