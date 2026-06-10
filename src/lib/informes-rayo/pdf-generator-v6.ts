// ═══ A&K Informes Rayo — PDF Generator v6 ═══
// Template: Claude Design — Source Serif 4 + Inter + Caveat
// Ported from template-claude-design.html with LLM analysis integration
// 8 slides, 450x800px, html2canvas + jsPDF

import { SlideAnalysisV2 } from './analysis-pipeline-v2'

// ── Types (same as v5) ──
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

// ── Colors ──
const CAT_COLORS: Record<string, string> = {
  'BEBIDAS': '#4ADE80',
  'COCTELES': '#C9A94E',
  'LICORES': '#E8D48B',
  'COMIDA': '#5D1528',
  'VINOS': '#A0522D',
}

function catColor(cat: string): string {
  return CAT_COLORS[cat.toUpperCase()] || '#706860'
}

// Semáforo icons
function semaforo(pctValue: number, meta: number = 30): string {
  if (pctValue >= 50) return '<span style="color:#4ADE80">◉</span>'
  if (pctValue >= meta) return '<span style="color:#FACC15">◐</span>'
  return '<span style="color:#EF4444">○</span>'
}

function emptySlide(title: string): string {
  return '<div class="slide"><div class="slide-label" style="opacity:0.3">Sin datos</div><div class="slide-title">' + title + '</div><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="text-align:center;color:var(--text-muted);font-size:13px">Sin datos de rentabilidad para este período</div></div><div class="watermark">A&K · Confidencial</div></div>'
}

// ═══════════════════════════════════════════════════════════════
// CSS — Claude Design (Source Serif 4 + Inter + Caveat)
// NIVEL 1 FIXES APPLIED:
// 1. @import Google Fonts INSIDE <style> so renderer extracts it
// 2. Explicit @font-face fallbacks with font-display: swap
// 3. All font-family references match exactly what @font-face registers
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600&display=swap');

/* ── @font-face FALLBACKS (Nivel 1 Fix 1.4) ──
   Solo para Inter y Caveat. Source Serif 4 se carga via Google Fonts @import
   con display=swap + stack CSS fallback (Georgia, serif).
   NOTA: No definir @font-face para Source Serif 4 para evitar conflicto de nombres
   entre Google Fonts (sin comillas) y fallback (con comillas). */
@font-face {
  font-family: Inter;
  src: local('Arial'), local('Helvetica'), local('system-ui');
  font-weight: 300 700;
  font-display: swap;
}
@font-face {
  font-family: Caveat;
  src: local('Comic Sans MS'), local('cursive');
  font-weight: 400 600;
  font-display: swap;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",system-ui,sans-serif;background:#0D0D0C;color:#F0EDE8;line-height:1.4;-webkit-font-smoothing:antialiased;width:450px}

:root{
  --bg:#0D0D0C;--surface:#141414;--surface-2:#1A1A1A;
  --text-primary:#F0EDE8;--text-secondary:#9A9590;--text-muted:#6B6560;
  --gold:#C9A94E;--gold-light:#E8D48B;--gold-dark:#8A7028;
  --borgona:#5D1528;--borgona-light:#7A1E35;--ladrillo:#A0522D;
  --verde:#4ADE80;--verde-muted:#2D6A3F;--amarillo:#FACC15;--rojo:#EF4444;
  --track:#1A1A1A;--border:#262626;
  --font-serif:"Source Serif 4",Georgia,serif;
  --font-sans:"Inter",Arial,system-ui,sans-serif;
  --font-script:"Caveat","Comic Sans MS",cursive;
}

.slide{width:450px;height:800px;overflow:hidden;position:relative;background:var(--bg);padding:32px 28px;display:flex;flex-direction:column}

/* ── Cover ── */
.slide-cover{background:var(--borgona);justify-content:space-between;padding:40px 32px 32px;color:#F0EDE8}
.cover-top{display:flex;justify-content:space-between;align-items:flex-start}
.cover-logo{font-family:var(--font-serif);font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold)}
.cover-date{font-size:10px;color:rgba(240,237,232,0.5);font-weight:400}
.cover-main{margin-top:auto;margin-bottom:auto}
.cover-script{font-family:var(--font-script);font-size:28px;color:var(--gold-light);margin-bottom:8px;line-height:1.2}
.cover-title{font-family:var(--font-serif);font-size:38px;font-weight:700;color:#F0EDE8;line-height:1.05;margin-bottom:16px}
.cover-sub{font-size:12px;color:rgba(240,237,232,0.6);line-height:1.5;max-width:280px;font-family:var(--font-sans)}
.cover-footer{border-top:1px solid rgba(201,169,78,0.25);padding-top:16px;display:flex;justify-content:space-between;align-items:center}
.cover-period{font-size:10px;color:var(--gold-light);font-weight:500;font-family:var(--font-sans)}
.cover-page{font-size:10px;color:rgba(240,237,232,0.35);font-family:var(--font-sans)}

/* ── Header ── */
.slide-label{font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;font-family:var(--font-sans)}
.slide-title{font-family:var(--font-serif);font-size:22px;font-weight:700;color:var(--text-primary);line-height:1.15;margin-bottom:20px}

/* ── Headline (IA) ── */
.slide-headline{font-family:var(--font-sans);font-size:12px;font-weight:500;color:var(--gold);line-height:1.45;margin:-8px 0 14px;padding:10px 14px;background:rgba(201,169,78,0.07);border-radius:8px;border-left:3px solid var(--gold)}

/* ── Metrics grid ── */
.metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px}
.metric-card{background:var(--surface);border-radius:8px;padding:16px 14px;border:1px solid var(--border)}
.metric-value{font-family:var(--font-serif);font-size:24px;font-weight:700;color:var(--gold);line-height:1}
.metric-delta{font-size:10px;color:var(--verde);font-weight:600;margin-top:4px;font-family:var(--font-sans)}
.metric-delta.negative{color:var(--rojo)}
.metric-name{font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-top:8px;font-family:var(--font-sans)}

/* ── Drena items ── */
.drena-list{margin-top:8px}
.drena-item{background:var(--surface);border-radius:8px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border);border-left:3px solid var(--ladrillo)}
.drena-item.warning{border-left-color:var(--amarillo)}
.drena-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.drena-name{font-size:13px;font-weight:600;color:var(--text-primary);font-family:var(--font-sans)}
.drena-metric{font-size:11px;color:var(--text-muted);font-weight:500;font-family:var(--font-sans)}
.drena-bar-row{display:flex;align-items:center;gap:10px;margin-top:8px}
.drena-bar{flex:1;height:6px;background:var(--track);border-radius:3px;overflow:hidden}
.drena-bar-fill{height:100%;border-radius:3px}
.drena-pct{font-size:10px;font-weight:700;color:var(--text-secondary);min-width:32px;text-align:right;font-family:var(--font-sans)}

/* ── Importa list ── */
.importa-list{margin-top:6px}
.importa-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
.importa-rank{font-family:var(--font-serif);font-size:18px;font-weight:700;color:var(--gold);width:24px;text-align:center;flex-shrink:0}
.importa-info{flex:1;min-width:0}
.importa-name{font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-sans)}
.importa-bar-wrap{margin-top:5px}
.importa-bar{height:5px;background:var(--track);border-radius:3px;overflow:hidden}
.importa-bar-fill{height:100%;border-radius:3px}
.importa-right{text-align:right;flex-shrink:0}
.importa-rev{font-family:var(--font-serif);font-size:13px;font-weight:600;color:var(--gold)}
.importa-margin{font-size:10px;color:var(--text-muted);font-weight:500;margin-top:2px;font-family:var(--font-sans)}

/* ── Composicion ── */
.comp-list{margin-top:10px}
.comp-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.comp-label{width:72px;font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary);text-align:right;flex-shrink:0;font-family:var(--font-sans)}
.comp-bar-area{flex:1}
.comp-bar{height:18px;background:var(--track);border-radius:4px;overflow:hidden;position:relative}
.comp-bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding-right:8px;justify-content:flex-end}
.comp-pct{font-size:10px;font-weight:700;color:var(--bg);text-shadow:0 1px 2px rgba(0,0,0,0.3);font-family:var(--font-sans)}
.comp-meta{display:flex;gap:12px;margin-top:3px;padding-left:2px}
.comp-meta-item{font-size:9px;color:var(--text-muted);font-family:var(--font-sans)}
.comp-meta-val{color:var(--text-secondary);font-weight:600}

/* ── Estrellas vs Lastre ── */
.vs-container{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;flex:1}
.vs-col{display:flex;flex-direction:column}
.vs-header{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);font-family:var(--font-sans)}
.vs-header.stars{color:var(--verde)}
.vs-header.lastre{color:var(--rojo)}
.vs-item{background:var(--surface);border-radius:6px;padding:8px;margin-bottom:6px;border:1px solid var(--border)}
.vs-name{font-size:10px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;font-family:var(--font-sans)}
.vs-bar-row{display:flex;align-items:center;gap:6px}
.vs-bar{flex:1;height:4px;background:var(--track);border-radius:2px;overflow:hidden}
.vs-bar-fill{height:100%;border-radius:2px}
.vs-val{font-size:9px;font-weight:700;color:var(--text-secondary);white-space:nowrap;font-family:var(--font-sans)}

/* ── Insight bullets ── */
.insights-list{margin-top:12px}
.insight-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:18px}
.insight-bullet{color:var(--gold);font-size:16px;line-height:1;flex-shrink:0;margin-top:2px}
.insight-text{font-size:12.5px;line-height:1.6;color:#E0D8CC;font-family:var(--font-sans)}
.insight-highlight{color:var(--gold);font-weight:600}

/* ── Junta cards ── */
.junta-list{margin-top:10px;display:flex;flex-direction:column;gap:12px}
.junta-card{background:var(--surface-2);border-radius:8px;padding:14px;border-left:3px solid;display:flex;gap:12px;align-items:flex-start}
.junta-card.green{border-left-color:var(--verde)}
.junta-card.yellow{border-left-color:var(--amarillo)}
.junta-card.gold{border-left-color:var(--gold)}
.junta-icon{font-size:20px;line-height:1;flex-shrink:0;margin-top:1px}
.junta-card.green .junta-icon{color:var(--verde)}
.junta-card.yellow .junta-icon{color:var(--amarillo)}
.junta-card.gold .junta-icon{color:var(--gold)}
.junta-body{flex:1;min-width:0}
.junta-text{font-size:12.5px;line-height:1.5;color:#E0D8CC;font-family:var(--font-sans)}
.junta-action{font-size:10px;color:var(--text-muted);margin-top:6px;font-weight:500;font-family:var(--font-sans)}
.junta-metric{font-family:var(--font-serif);font-size:16px;font-weight:700;color:var(--gold);margin-top:4px;line-height:1}

/* ── Mensaje al equipo ── */
.mensaje-equipo{margin-top:14px;background:linear-gradient(135deg,rgba(92,21,40,0.35),rgba(13,13,12,0.6));border-radius:10px;padding:16px 14px;border:1px solid rgba(201,169,78,0.2)}
.mensaje-equipo-header{font-family:var(--font-script);font-size:18px;color:var(--gold);margin-bottom:8px;line-height:1.2}
.mensaje-equipo-body{font-size:11.5px;line-height:1.65;color:#E0D8CC;font-family:var(--font-sans)}
.mensaje-equipo-body p{margin:0 0 8px 0}
.mensaje-equipo-body p:last-child{margin-bottom:0}
.mensaje-equipo-body strong{color:var(--gold);font-weight:600}

/* ── Analysis block (slide 9) ── */
.analysis-block{background:var(--surface);border-radius:8px;padding:12px 14px;margin-bottom:10px}
.analysis-block-header{font-size:10px;font-weight:700;color:#F0EDE8;margin-bottom:6px;display:flex;align-items:center;gap:6px;font-family:var(--font-sans)}
.analysis-block-body{font-size:10px;line-height:1.5;color:#E0D8CC;font-family:var(--font-sans)}

/* ── Watermark ── */
.watermark{position:absolute;bottom:14px;right:18px;font-family:var(--font-sans);font-size:9px;color:rgba(240,237,232,0.08);font-weight:600;letter-spacing:0.15em;text-transform:uppercase;pointer-events:none}

/* ── Footer ── */
.slide-footer{margin-top:auto;padding-top:20px;border-top:1px solid var(--border);text-align:center}
.slide-footer-text{font-size:9px;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;font-family:var(--font-sans)}

/* ── Empty state ── */
.empty-state{flex:1;display:flex;align-items:center;justify-content:center}
.empty-msg{font-family:var(--font-sans);font-size:14px;color:var(--text-muted);text-align:center;padding:0 32px}
`

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR v6 — Claude Design + Analysis LLM
// ═══════════════════════════════════════════════════════════════
export function generatePDFHtmlV6(input: PDFGeneratorInput): string {
  const { data, from, to, margins, analysis } = input
  const a = analysis

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const hasMargins = !!(margins && margins.kpis && margins.kpis.total_productos > 0)

  // Headlines from IA
  const headline2 = a?.slide_2_headline || (hasMargins ? 'Margen ' + margins!.kpis.margin_pct.toFixed(1) + '% — Resumen del período' : 'Resumen del período')
  const headline3 = a?.slide_3_headline || (hasMargins ? margins!.drenan.length + ' productos en riesgo' : 'Diagnóstico operativo')
  const headline5 = a?.slide_5_headline || (hasMargins ? 'Composición del margen por categoría' : 'Estructura de rentabilidad')

  const slides: string[] = []
  const totalPages = hasMargins ? 8 : 4

  // ═══ SLIDE 1 — PORTADA (borgoña) ═══
  slides.push(
    '<div class="slide slide-cover">' +
    '<div class="cover-top"><div class="cover-logo">Attick &amp; Keller</div><div class="cover-date">' + todayLabel + '</div></div>' +
    '<div class="cover-main"><div class="cover-script">Informe de rentabilidad</div><div class="cover-title">Informe<br>Rayo</div><div class="cover-sub">Análisis operativo de márgenes, productos y decisiones para la junta directiva.</div></div>' +
    '<div class="cover-footer"><div class="cover-period">' + periodLabel + '</div><div class="cover-page">01 / ' + totalPages + '</div></div>' +
    '<div class="watermark">A&amp;K · Confidencial</div>' +
    '</div>'
  )

  // ═══ SLIDE 2 — METRICAS CLAVE + HEADLINE IA ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const analysisText = a?.slide_2_metrics || ''
    const compDelta = data.comparison?.kpis
      ? pct(mk.total_revenue, Number(data.comparison.kpis.total_ventas ?? data.comparison.kpis.propina_total ?? 0))
      : ''
    const marginDelta = data.comparison?.kpis
      ? pct(mk.margin_pct, 30)
      : ''

    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Resumen ejecutivo</div>' +
      '<div class="slide-title">Métricas clave<br>del período</div>' +
      (headline2 ? '<div class="slide-headline">' + headline2 + '</div>' : '') +
      '<div class="metrics-grid">' +
      '<div class="metric-card"><div class="metric-value">' + fmt(mk.total_revenue) + '</div><div class="metric-delta">' + (compDelta || '↑ vs período anterior') + '</div><div class="metric-name">Ventas totales</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + mk.margin_pct.toFixed(1) + '%</div><div class="metric-delta">' + semaforo(mk.margin_pct) + ' ' + (mk.margin_pct >= 30 ? 'Sobre meta' : 'Bajo meta') + '</div><div class="metric-name">Margen general</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + fmtN(mk.total_productos) + '</div><div class="metric-delta">con margen calculable</div><div class="metric-name">Productos</div></div>' +
      '<div class="metric-card"><div class="metric-value">' + fmt(mk.margin_bruto) + '</div><div class="metric-delta">ganancia neta total</div><div class="metric-name">Margen bruto</div></div>' +
      '</div>' +
      (analysisText && analysisText !== headline2 ? '<div class="slide-headline" style="border-left-color:var(--gold);color:var(--gold);background:rgba(201,169,78,0.07)">' + analysisText + '</div>' : '') +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('MÉTRICAS CLAVE')) }

  // ═══ SLIDE 3 — LO QUE DRENA (drena-item cards) ═══
  if (hasMargins && margins!.drenan.length > 0) {
    const drenaRows = margins!.drenan.slice(0, 5).map(p => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : (p.product_name || 'N/A')
      const isWarning = p.margin_pct >= 30
      const barColor = p.margin_pct < 30 ? 'var(--ladrillo)' : 'var(--amarillo)'
      return '<div class="drena-item' + (isWarning ? ' warning' : '') + '">' +
        '<div class="drena-header"><div class="drena-name">' + name.toUpperCase() + '</div><div class="drena-metric">' + fmt(p.revenue) + ' · ' + fmtN(1) + ' producto</div></div>' +
        '<div class="drena-bar-row"><div class="drena-bar"><div class="drena-bar-fill" style="width:' + Math.max(p.margin_pct, 5) + '%;background:' + barColor + '"></div></div><div class="drena-pct">' + Math.round(p.margin_pct) + '%</div></div>' +
        '</div>'
    }).join('')
    const analysisText = a?.slide_3_drena || ''
    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Diagnóstico operativo</div>' +
      '<div class="slide-title">Lo que drena<br>el negocio</div>' +
      '<div class="slide-headline" style="background:rgba(160,82,45,0.07);border-left-color:var(--ladrillo);color:var(--ladrillo)">' + headline3 + '</div>' +
      '<div class="drena-list">' + drenaRows + '</div>' +
      (analysisText && analysisText !== headline3 ? '<div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--border)"><div class="insight-item" style="margin-bottom:0"><div class="insight-bullet">⚠</div><div class="insight-text" style="font-size:11px;color:var(--text-muted)">' + analysisText + '</div></div></div>' : '') +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('LO QUE DRENA')) }

  // ═══ SLIDE 4 — LO QUE IMPORTA (importa-rank) ═══
  if (hasMargins && margins!.importan.length > 0) {
    const top7 = margins!.importan.slice(0, 7)
    const maxMarginPct = Math.max(...top7.map(p => p.margin_pct || 0), 1)
    const rows = top7.map((p, i) => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : (p.product_name || 'N/A')
      const barPct = maxMarginPct > 0 ? (p.margin_pct / maxMarginPct) * 100 : 0
      const barColor = p.margin_pct > 50 ? 'var(--gold)' : p.margin_pct > 30 ? 'var(--gold-light)' : 'var(--ladrillo)'
      return '<div class="importa-row">' +
        '<div class="importa-rank">' + (i + 1) + '</div>' +
        '<div class="importa-info"><div class="importa-name">' + name.toUpperCase() + '</div>' +
        '<div class="importa-bar-wrap"><div class="importa-bar"><div class="importa-bar-fill" style="width:' + barPct.toFixed(1) + '%;background:' + barColor + '"></div></div></div></div>' +
        '<div class="importa-right"><div class="importa-rev">' + fmt(p.revenue) + '</div><div class="importa-margin">' + Math.round(p.margin_pct) + '%</div></div>' +
        '</div>'
    }).join('')
    const analysisText = a?.slide_4_importan || ''
    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Top performers</div>' +
      '<div class="slide-title">Lo que importa<br>Top 1 — 7</div>' +
      (analysisText ? '<div class="slide-headline">' + analysisText + '</div>' : '') +
      '<div class="importa-list">' + rows + '</div>' +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('LO QUE IMPORTA')) }

  // ═══ SLIDE 5 — COMPOSICIÓN DEL MARGEN (comp-bar with text inside) ═══
  if (hasMargins && margins!.resumen_ejecutivo.categorias.length > 0) {
    const cats = margins!.resumen_ejecutivo.categorias
    const maxRev = Math.max(...cats.map(c => Number(c.revenue || 0)), 1)
    const catColors: Record<string, string> = { 'BEBIDAS': '#4ADE80', 'COCTELES': '#C9A94E', 'LICORES': '#E8D48B', 'COMIDA': '#5D1528', 'VINOS': '#A0522D' }
    const rows = cats.map(c => {
      const color = catColors[c.categoria.toUpperCase()] || '#6B2737'
      const barW = maxRev > 0 ? (Number(c.revenue || 0) / maxRev) * 100 : 0
      return '<div class="comp-row">' +
        '<div class="comp-label" style="color:' + color + '">' + c.categoria + '</div>' +
        '<div class="comp-bar-area"><div class="comp-bar"><div class="comp-bar-fill" style="width:' + barW.toFixed(1) + '%;background:' + color + '"><span class="comp-pct">' + c.margin_pct + '%</span></div></div>' +
        '<div class="comp-meta"><div class="comp-meta-item">Rev: <span class="comp-meta-val">' + fmt(c.revenue) + '</span></div><div class="comp-meta-item">SKU: <span class="comp-meta-val">' + fmtN(c.count) + '</span></div></div></div>' +
        '</div>'
    }).join('')
    const analysisText = a?.slide_5_composicion || ''
    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Estructura de rentabilidad</div>' +
      '<div class="slide-title">Composición<br>del margen</div>' +
      '<div class="slide-headline" style="background:rgba(74,222,128,0.06);border-left-color:var(--verde);color:var(--verde-muted)">' + headline5 + '</div>' +
      '<div class="comp-list">' + rows + '</div>' +
      (analysisText && analysisText !== headline5 ? '<div class="slide-headline" style="background:rgba(74,222,128,0.06);border-left-color:var(--verde);color:var(--verde-muted)">' + analysisText + '</div>' : '') +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('COMPOSICIÓN DEL MARGEN')) }

  // ═══ SLIDE 6 — ESTRELLAS vs LASTRE (vs-container grid) ═══
  if (hasMargins) {
    const estrellas = [...margins!.importan].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0)).slice(0, 5)
    const lastre = [...margins!.drenan].sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0)).slice(0, 5)
    const maxStarPct = Math.max(...estrellas.map(p => p.margin_pct || 0), 1)
    const maxLastrePct = Math.max(...lastre.map(p => Math.abs(p.margin_pct || 0)), 1)

    const estrellasHtml = estrellas.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : (p.product_name || 'N/A')
      const barW = maxStarPct > 0 ? (p.margin_pct / maxStarPct) * 100 : 0
      return '<div class="vs-item"><div class="vs-name">' + name.toUpperCase() + '</div><div class="vs-bar-row"><div class="vs-bar"><div class="vs-bar-fill" style="width:' + barW.toFixed(1) + '%;background:var(--verde)"></div></div><div class="vs-val">' + fmt(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%</div></div></div>'
    }).join('')

    const lastreHtml = lastre.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : (p.product_name || 'N/A')
      const barW = maxLastrePct > 0 ? (Math.abs(p.margin_pct) / maxLastrePct) * 100 : 0
      const barColor = p.margin_pct < 0 ? 'var(--rojo)' : p.margin_pct < 30 ? 'var(--amarillo)' : 'var(--verde)'
      return '<div class="vs-item"><div class="vs-name">' + name.toUpperCase() + '</div><div class="vs-bar-row"><div class="vs-bar"><div class="vs-bar-fill" style="width:' + barW.toFixed(1) + '%;background:' + barColor + '"></div></div><div class="vs-val">' + fmt(p.margin_bruto) + ' · ' + Math.round(p.margin_pct) + '%</div></div></div>'
    }).join('')

    const analysisText = a?.slide_6_estrellas_lastre || ''
    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Dualidad operativa</div>' +
      '<div class="slide-title">Estrellas vs<br>Lastre</div>' +
      (analysisText ? '<div class="slide-headline" style="background:rgba(240,237,232,0.03);border-left-color:var(--text-primary);color:var(--text-primary)">' + analysisText + '</div>' : '') +
      '<div class="vs-container"><div class="vs-col"><div class="vs-header stars">⭐ ESTRELLAS — Top 5</div>' + estrellasHtml + '</div><div class="vs-col"><div class="vs-header lastre">⚠ LASTRE — Bottom 5</div>' + lastreHtml + '</div></div>' +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('ESTRELLAS vs LASTRE')) }

  // ═══ SLIDE 7 — DATOS QUE IMPORTAN (insight bullets) ═══
  if (hasMargins) {
    const bullets = a?.slide_7_bullets && a.slide_7_bullets.length > 0
      ? a.slide_7_bullets
      : a?.slide_7_insights && a.slide_7_insights.length > 0
        ? a.slide_7_insights.map(t => ({ icon: '', title: '', body: t }))
        : []

    // Fallback from data
    const fallbackBullets: { icon: string; title: string; body: string }[] = []
    if (bullets.length === 0) {
      const mk = margins!.kpis
      const cats = margins!.resumen_ejecutivo.categorias
      const topImportan = margins!.importan.length > 0 ? margins!.importan[0] : null
      const bestCat = cats.length > 0 ? [...cats].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0] : null
      const worstCat = cats.length > 0 ? [...cats].sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))[0] : null
      if (topImportan) fallbackBullets.push({ icon: '', title: 'Producto estrella', body: '<span class="insight-highlight">' + topImportan.product_name + '</span> genera ' + fmt(topImportan.margin_bruto) + ' netos' })
      if (bestCat) fallbackBullets.push({ icon: '', title: bestCat.categoria, body: '<span class="insight-highlight">' + bestCat.categoria + '</span> tiene ' + bestCat.margin_pct + '% de margen con ' + fmtN(bestCat.count) + ' productos' })
      if (worstCat && worstCat.categoria !== bestCat?.categoria) fallbackBullets.push({ icon: '', title: worstCat.categoria, body: '<span class="insight-highlight">' + worstCat.categoria + '</span> muestra solo ' + worstCat.margin_pct + '% de margen' })
      fallbackBullets.push({ icon: '', title: 'Meta cumplida', body: 'El <span class="insight-highlight">' + mk.margin_pct.toFixed(1) + '% de margen general</span> supera la meta del 30%' })
    }

    const allBullets = bullets.length > 0 ? bullets : fallbackBullets
    const bulletsHtml = allBullets.slice(0, 5).map(b => {
      const body = b.body.replace(/\n/g, '<br>')
      return '<div class="insight-item"><div class="insight-bullet">•</div><div class="insight-text">' + body + '</div></div>'
    }).join('')

    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Inteligencia operativa</div>' +
      '<div class="slide-title">Datos que<br>importan</div>' +
      '<div class="insights-list">' + bulletsHtml + '</div>' +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('DATOS QUE IMPORTAN')) }

  // ═══ SLIDE 8 — PARA LA JUNTA + MENSAJE AL EQUIPO ═══
  if (hasMargins) {
    const cards = a?.slide_8_cards && a.slide_8_cards.length > 0 ? a.slide_8_cards : []
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const bestCat = cats.length > 0 ? [...cats].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0] : null
    const drenaCount = margins!.drenan.length

    const fallbackCards: { emoji: string; title: string; action: string; metric: string }[] = []
    if (cards.length === 0) {
      if (bestCat) fallbackCards.push({ emoji: '✅', title: bestCat.categoria.toUpperCase() + ' lidera con ' + bestCat.margin_pct + '% margen', action: 'Mantener precios y duplicar promociones en horas pico', metric: bestCat.margin_pct + '% margen' })
      fallbackCards.push({ emoji: '⚠', title: drenaCount + ' productos en el 5% inferior', action: 'Evaluar menú: ajustar precios o replantear referencias de baja rentabilidad', metric: 'Bottom 5%' })
      fallbackCards.push({ emoji: '◉', title: 'Margen general ' + mk.margin_pct.toFixed(1) + '% — saludable', action: 'Crecimiento sostenible. Revisar presupuesto Q3 con este escenario', metric: mk.margin_pct.toFixed(1) + '% margen' })
    }

    const allCards = cards.length > 0 ? cards : fallbackCards
    const cardClasses = ['green', 'yellow', 'gold']
    const cardsHtml = allCards.slice(0, 3).map((c, i) => {
      const borderClass = cardClasses[i] || 'gold'
      const metricHtml = c.metric ? '<div class="junta-metric">' + c.metric + '</div>' : ''
      const titleHtml = c.title ? '<strong style="color:var(--' + borderClass + ')">' + c.title + '</strong> — ' : ''
      return '<div class="junta-card ' + borderClass + '"><div class="junta-icon">' + c.emoji + '</div><div class="junta-body"><div class="junta-text">' + titleHtml + c.action + '</div>' + metricHtml + '</div></div>'
    }).join('')

    // ── Mensaje al equipo ──
    const mensaje = a?.slide_junta_mensaje || ''
    let mensajeHtml = ''
    if (mensaje) {
      // Split by double newlines into paragraphs
      const paragraphs = mensaje.split(/\n\n+/).filter(p => p.trim())
      const bodyContent = paragraphs.map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('')
      mensajeHtml = '<div class="mensaje-equipo">' +
        '<div class="mensaje-equipo-header">Mensaje al equipo</div>' +
        '<div class="mensaje-equipo-body">' + bodyContent + '</div>' +
        '</div>'
    }

    slides.push(
      '<div class="slide">' +
      '<div class="slide-label">Recomendaciones</div>' +
      '<div class="slide-title">Para la<br>junta</div>' +
      '<div class="junta-list">' + cardsHtml + '</div>' +
      mensajeHtml +
      '<div class="slide-footer"><div class="slide-footer-text">Informe generado · Attick &amp; Keller · ' + todayLabel + '</div></div>' +
      '<div class="watermark">A&amp;K · Confidencial</div>' +
      '</div>'
    )
  } else { slides.push(emptySlide('PARA LA JUNTA')) }

  // ── Assemble full HTML ──
  const slidesHtml = slides.map((s, i) => {
    return s.replace('class="slide"', 'class="slide" data-index="' + i + '"')
      .replace('class="slide slide-cover"', 'class="slide slide-cover" data-index="' + i + '"')
  }).join('\n')

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body>' + slidesHtml + '</body></html>'
}