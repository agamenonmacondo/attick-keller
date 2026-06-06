// ═══ A&K Informes Rayo — PDF HTML Generator (9:16 Mobile Slides) ═══
// Design system: Source Serif 4 (titles) + Inter (body) + Caveat (script)
// A&K Lightning Theme palette: borgona #5D1528, dorado #C9A94E, ladrillo #A0522D
// CSS tokens derived from Stitch DESIGN.md — matches A&K brand identity
// Self-contained HTML designed for html2canvas + jsPDF rendering
// Each .slide is 450×800px, captured at 3x resolution

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
  total_ventas?: number
  total_cheques?: number
}

interface PaymentData {
  payment_method?: string
  total?: number
  cheques?: number
  pct?: number
}

interface ProductData {
  product_name?: string
  category_name?: string
  quantity?: number
  revenue?: number
}

interface ProductHourlyItem {
  product_name: string
  product_id: string
  category_name: string
  date: string
  hour: number
  quantity: number
  revenue: number
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
  analysis?: string | null
  productHourly?: ProductHourlyItem[]
  margins?: MarginsData | null
}

// ── Formatters ──
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

function pct(a: number, b: number): string {
  if (!b || b === 0) return ''
  const d = ((a - b) / b) * 100
  return `${d >= 0 ? '↑' : '↓'}${Math.abs(d).toFixed(1)}%`
}

// ── Date formatting (Colombia locale) ──
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function formatDateEs(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

function formatDayName(dateStr: string): string {
  return DAYS[new Date(dateStr + 'T00:00:00').getDay()]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

// ── Product hourly matrix builder ──
interface ProductRow {
  name: string
  category: string
  hourly: Map<number, number>
  totalRevenue: number
}

function buildProductHourlyMatrix(items: ProductHourlyItem[]): {
  products: ProductRow[]
  hours: number[]
  grandTotal: number
} {
  const prodMap = new Map<string, ProductRow>()
  const hourSet = new Set<number>()

  for (const row of items) {
    const h = Number(row.hour)
    hourSet.add(h)
    const key = row.product_name
    if (!prodMap.has(key)) {
      prodMap.set(key, { name: row.product_name, category: row.category_name || '', hourly: new Map(), totalRevenue: 0 })
    }
    const prod = prodMap.get(key)!
    const rev = Number(row.revenue) || 0
    prod.totalRevenue += rev
    prod.hourly.set(h, (prod.hourly.get(h) ?? 0) + rev)
  }

  const products = [...prodMap.values()]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 6)

  const allHours = [...hourSet].sort((a, b) => a - b)
  const peakHours = allHours.filter(h => h >= 12 && h <= 23)
  const hours = peakHours.length > 0 ? peakHours : allHours.slice(0, 10)
  const grandTotal = products.reduce((s, p) => s + p.totalRevenue, 0)

  return { products, hours, grandTotal }
}

// ── Analysis section parser ──
interface AnalysisSection {
  icon: string
  title: string
  body: string
}

function parseAnalysisSections(analysis: string): AnalysisSection[] {
  const blocks = analysis.split(/\n\n+/)
  const sections: AnalysisSection[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.length < 10) continue

    const lines = trimmed.split('\n')
    const firstLine = lines[0].trim()
    const body = lines.slice(1).join('\n').trim()

    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{26A0}\u{1F4CA}\u{1F3C6}\u{1F4A1}\u{1F4CB}\u{1F50D}\u{1F4C8}\u{1F4C9}]/u.test(firstLine)
    const hasBold = firstLine.includes('**')
    const isShort = firstLine.length < 80 && body.length > 0

    if ((hasEmoji || hasBold || isShort) && body) {
      const icon = hasEmoji ? firstLine.charAt(0) : (hasBold ? '\u{1F4CB}' : '•')
      const title = firstLine
        .replace(/^\p{Emoji}+/u, '')
        .replace(/\*\*/g, '')
        .replace(/^[:\s-]+/, '')
        .trim()
      sections.push({ icon, title, body })
    } else {
      const words = trimmed.split(/\s+/)
      const title = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '')
      sections.push({ icon: '•', title, body: trimmed })
    }
  }

  return sections
}

// ── Category aggregator ──
interface CategorySummary {
  category: string
  revenue: number
  pct: number
}

function buildCategorySummary(products: ProductData[]): CategorySummary[] {
  const map = new Map<string, number>()
  for (const p of products) {
    const cat = p.category_name || 'Sin categoría'
    map.set(cat, (map.get(cat) ?? 0) + Number(p.revenue ?? 0))
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0)
  return [...map.entries()]
    .map(([category, revenue]) => ({ category, revenue, pct: total > 0 ? (revenue / total) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ── SVG Donut Chart (A&K colors) ──
function buildDonutSvg(payments: PaymentData[], total: number): string {
  const colors = ['#C9A94E', '#5D1528', '#A0522D']
  const labels = ['Efectivo', 'Tarjeta', 'Transferencia']
  let cumulative = 0
  let slices = ''
  const cx = 140, cy = 110, r = 90, inner = 58

  for (let i = 0; i < labels.length; i++) {
    const val = Number(payments[i]?.total ?? 0)
    if (val <= 0) continue
    const seg = val / (total || 1)
    const end = cumulative + seg
    const x1 = (cx + r * Math.cos(cumulative * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const y1 = (cy + r * Math.sin(cumulative * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const x2 = (cx + r * Math.cos(end * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const y2 = (cy + r * Math.sin(end * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const large = seg > 0.5 ? 1 : 0
    const ix1 = (cx + inner * Math.cos(end * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const iy1 = (cy + inner * Math.sin(end * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const ix2 = (cx + inner * Math.cos(cumulative * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    const iy2 = (cy + inner * Math.sin(cumulative * 2 * Math.PI - Math.PI / 2)).toFixed(1)
    slices += `<path d="M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z" fill="${colors[i]}" opacity="0.92"/>`
    cumulative = end
  }

  const dominantPct = payments.length > 0 && total > 0
    ? Math.round((Math.max(...payments.map(p => Number(p.total ?? 0))) / total) * 100)
    : 0

  let legendHtml = ''
  for (let i = 0; i < labels.length; i++) {
    const val = Number(payments[i]?.total ?? 0)
    const p = total > 0 ? Math.round((val / total) * 100) : 0
    legendHtml += `<div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span class="legend-label">${labels[i]}</span>
      <span class="legend-val">${fmt(val)}</span>
      <span class="legend-pct">${p}%</span>
    </div>`
  }

  return `<div class="donut-wrap">
    <svg width="320" height="260" viewBox="0 0 320 260">
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="${inner}" fill="#0D0D0D"/>
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#F0EDE8" font-family="DM Sans, sans-serif" font-size="32" font-weight="700">${dominantPct}%</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="#A09890" font-family="DM Sans, sans-serif" font-size="10">método líder</text>
    </svg>
    <div class="donut-legend">${legendHtml}</div>
  </div>`
}

// ── Progress bar ──
function progressBar(label: string, value: number, max: number, color: string, showVal: string, showPct?: string): string {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return `<div class="bar-row">
    <span class="bar-label" title="${label}">${label}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
    <span class="bar-val">${showVal}</span>
    ${showPct ? `<span class="bar-pct">${showPct}</span>` : ''}
  </div>`
}

// ── CSV export helper ──
function buildProductHourlyTable(items: ProductHourlyItem[]): { products: ProductRow[]; hours: number[]; grandTotal: number } {
  return buildProductHourlyMatrix(items)
}

// ── Category helpers ──
function catLetter(cat: string): string {
  const u = cat.toUpperCase()
  if (u.includes('COCTEL')) return 'C'
  if (u.includes('LICOR')) return 'L'
  if (u.includes('VINO')) return 'V'
  if (u.includes('COMID')) return 'M'
  if (u.includes('BEBID')) return 'B'
  return cat.charAt(0).toUpperCase()
}

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
  if (pctValue >= 50) return '<span class="semaforo semaforo-green">◉</span>'
  if (pctValue >= meta) return '<span class="semaforo semaforo-yellow">◐</span>'
  return '<span class="semaforo semaforo-red">○</span>'
}

// ── Empty state slide ──
function emptySlide(title: string): string {
  return `<div class="slide">
    <div class="slide-header">
      <span class="slide-hdr-title">${title}</span>
    </div>
    <div class="empty-state">
      <div class="empty-msg">Sin datos de rentabilidad para este período</div>
    </div>
    <div class="slide-footer">
      <span>ATTICK & KELLER • INFORME RAYO</span>
    </div>
  </div>`
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════
export function generatePDFHtml(input: PDFGeneratorInput): string {

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR — Light Editorial Theme (A&K Rústico Moderno)
// ═══════════════════════════════════════════════════════════════
export function generatePDFHtml(input: PDFGeneratorInput): string {
  const { data, from, to, margins, analysis } = input

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const hasMargins = !!(margins && margins.kpis && margins.kpis.total_productos > 0)

  const slides: string[] = []

  // ═══ SLIDE 1 — PORTADA ═══
  slides.push(`<div class="slide slide-cover">
    <div class="cover-top"><div class="cover-logo">Attick &amp; Keller</div><div class="cover-date">${todayLabel}</div></div>
    <div class="cover-main">
      <div class="cover-script">Informe de rentabilidad</div>
      <div class="cover-title">Informe<br>Rayo</div>
      <div class="cover-sub">Análisis operativo de márgenes, productos y decisiones para la junta directiva.</div>
    </div>
    <div class="cover-footer"><div class="cover-period">${periodLabel}</div><div class="cover-page">01 / 10</div></div>
    <div class="watermark">A&amp;K · Confidencial</div>
  </div>`)

  // ═══ SLIDE 2 — KPIs VITALES ═══
  if (hasMargins) {
    const mk = margins!.kpis
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Resumen ejecutivo</div><div class="slide-title">Métricas clave<br>del período</div></div>
      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-value">${fmt(mk.total_revenue)}</div><div class="metric-delta">${mk.total_revenue > 0 ? '↑ vs período anterior' : '—'}</div><div class="metric-name">Ventas totales</div></div>
        <div class="metric-card"><div class="metric-value">${mk.margin_pct.toFixed(1)}%</div><div class="metric-delta">${mk.margin_pct >= 30 ? '↑ Sobre meta (30%)' : '↓ Bajo meta'}</div><div class="metric-name">Margen general</div></div>
        <div class="metric-card"><div class="metric-value">${fmtN(mk.total_productos)}</div><div class="metric-delta">con margen calculable</div><div class="metric-name">Productos</div></div>
        <div class="metric-card"><div class="metric-value">${fmt(mk.margin_bruto)}</div><div class="metric-delta">ganancia neta total</div><div class="metric-name">Margen bruto</div></div>
      </div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('MÉTRICAS CLAVE')) }

  // ═══ SLIDE 3 — LO QUE DRENA ═══
  if (hasMargins && margins!.drenan.length > 0) {
    const drenaRows = margins!.drenan.slice(0, 4).map(p => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : p.product_name
      const barColor = p.margin_pct < 30 ? '#A0522D' : '#D4922A'
      return `<div class="drena-item ${p.margin_pct < 30 ? '' : 'warning'}">
        <div class="drena-header"><span class="drena-name">${name}</span><div class="drena-metric">${fmt(p.revenue)} · ${p.macro_category}</div></div>
        <div class="drena-bar-row"><div class="drena-bar"><div class="drena-bar-fill" style="width:${Math.max(p.margin_pct, 5)}%;background:${barColor}"></div></div><div class="drena-pct">${Math.round(p.margin_pct)}%</div></div>
      </div>`
    }).join('')
    const insight = margins!.drenan[0]?.diagnostico ? margins!.drenan[0].diagnostico.substring(0, 140) + (margins!.drenan[0].diagnostico.length > 140 ? '…' : '') : 'Productos en el 5% inferior por ganancia neta requieren atención inmediata.'
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Diagnóstico operativo</div><div class="slide-title">Lo que drena<br>el negocio</div></div>
      <div class="drena-list">${drenaRows}</div>
      <div class="drena-insight"><div class="drena-insight-text"><strong>⚠ MARGEN BAJO PRESIÓN</strong> — ${insight}</div></div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('LO QUE DRENA')) }

  // ═══ SLIDE 4 — LO QUE IMPORTA (TOP 1-7) ═══
  if (hasMargins && margins!.importan.length > 0) {
    const top7 = margins!.importan.slice(0, 7)
    const maxMarginPct = Math.max(...top7.map(p => p.margin_pct || 0), 1)
    const rows = top7.map((p, i) => {
      const name = (p.product_name || '').length > 28 ? p.product_name.substring(0, 28) + '…' : p.product_name
      const barPct = maxMarginPct > 0 ? (p.margin_pct / maxMarginPct) * 100 : 0
      const barColor = p.margin_pct > 50 ? '#C9A94E' : p.margin_pct > 30 ? '#D4B76A' : '#A0522D'
      return `<div class="importa-row">
        <div class="importa-rank">${i + 1}</div>
        <div class="importa-info"><div class="importa-name">${name}</div><div class="importa-bar-wrap"><div class="importa-bar"><div class="importa-bar-fill" style="width:${barPct.toFixed(1)}%;background:${barColor}"></div></div></div></div>
        <div class="importa-right"><div class="importa-rev">${fmt(p.revenue)}</div><div class="importa-pct">${Math.round(p.margin_pct)}% margen</div></div>
      </div>`
    }).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Top performers</div><div class="slide-title">Lo que importa<br>Top 1 — 7</div></div>
      <div class="importa-list">${rows}</div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('LO QUE IMPORTA')) }

  // ═══ SLIDE 5 — COMPOSICIÓN DEL MARGEN ═══
  if (hasMargins && margins!.resumen_ejecutivo.categorias.length > 0) {
    const cats = margins!.resumen_ejecutivo.categorias
    const maxRev = Math.max(...cats.map(c => Number(c.revenue || 0)), 1)
    const catColors = { 'BEBIDAS': '#5C7A4D', 'COCTELES': '#6B2737', 'LICORES': '#C9A94E', 'COMIDA': '#A0522D', 'VINOS': '#D4922A' }
    const rows = cats.map(c => {
      const color = catColors[c.categoria.toUpperCase()] || '#6B2737'
      const barW = maxRev > 0 ? (Number(c.revenue || 0) / maxRev) * 100 : 0
      return `<div class="comp-row">
        <div class="comp-label" style="color:${color}">${c.categoria}</div>
        <div class="comp-bar-area">
          <div class="comp-bar"><div class="comp-bar-fill" style="width:${barW.toFixed(1)}%;background:${color}"><span class="comp-pct">${c.margin_pct}%</span></div></div>
          <div class="comp-meta"><div class="comp-meta-item">Rev: <span class="comp-meta-val">${fmt(c.revenue)}</span></div><div class="comp-meta-item">SKU: <span class="comp-meta-val">${fmtN(c.count)}</span></div></div>
        </div>
      </div>`
    }).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Estructura de rentabilidad</div><div class="slide-title">Composición<br>del margen</div></div>
      <div class="comp-list">${rows}</div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('COMPOSICIÓN DEL MARGEN')) }

  // ═══ SLIDE 6 — ESTRELLAS vs LASTRE ═══
  if (hasMargins) {
    const estrellas = [...margins!.importan].sort((a,b)=>Number(b.margin_pct||0)-Number(a.margin_pct||0)).slice(0,5)
    const lastre = [...margins!.drenan].sort((a,b)=>Number(a.margin_pct||0)-Number(b.margin_pct||0)).slice(0,5)
    const maxStarPct = Math.max(...estrellas.map(p=>p.margin_pct||0),1)
    const maxLastrePct = Math.max(...lastre.map(p=>Math.abs(p.margin_pct||0)),1)
    const estrellasRows = estrellas.map(p=>{
      const name = (p.product_name||'').length>18?p.product_name.substring(0,18)+'…':p.product_name
      const barW = maxStarPct>0?(p.margin_pct/maxStarPct)*100:0
      return `<div class="vs-item"><div class="vs-name">${name}</div><div class="vs-bar-row"><div class="vs-bar"><div class="vs-bar-fill" style="width:${barW.toFixed(1)}%;background:#5C7A4D"></div></div><div class="vs-val">${fmt(p.margin_bruto)} · ${Math.round(p.margin_pct)}%</div></div></div>`
    }).join('')
    const lastreRows = lastre.map(p=>{
      const name = (p.product_name||'').length>18?p.product_name.substring(0,18)+'…':p.product_name
      const barW = maxLastrePct>0?(Math.abs(p.margin_pct)/maxLastrePct)*100:0
      const color = p.margin_pct<0?'#A0522D':p.margin_pct<30?'#D4922A':'#5C7A4D'
      return `<div class="vs-item"><div class="vs-name">${name}</div><div class="vs-bar-row"><div class="vs-bar"><div class="vs-bar-fill" style="width:${barW.toFixed(1)}%;background:${color}"></div></div><div class="vs-val">${fmt(p.margin_bruto)} · ${Math.round(p.margin_pct)}%</div></div></div>`
    }).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Dualidad operativa</div><div class="slide-title">Estrellas vs<br>Lastre</div></div>
      <div class="vs-container"><div class="vs-col"><div class="vs-header stars">⭐ ESTRELLAS — Top 5 margen</div>${estrellasRows}</div><div class="vs-col"><div class="vs-header lastre">⚠ LASTRE — Bottom 5</div>${lastreRows}</div></div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('ESTRELLAS vs LASTRE')) }

  // ═══ SLIDE 7 — DATOS QUE IMPORTAN ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const topImportan = margins!.importan.length>0?margins!.importan[0]:null
    const bestCat = cats.length>0?[...cats].sort((a,b)=>Number(b.margin_pct||0)-Number(a.margin_pct||0))[0]:null
    const worstCat = cats.length>0?[...cats].sort((a,b)=>Number(a.margin_pct||0)-Number(b.margin_pct||0))[0]:null
    const comidaCat = cats.find(c=>c.categoria.toUpperCase().includes('COMID'))
    const bebidasCat = cats.find(c=>c.categoria.toUpperCase().includes('BEBID'))
    const bullets = []
    if (topImportan) bullets.push(`<strong class="insight-highlight">${topImportan.product_name}</strong> genera ${fmt(topImportan.margin_bruto)} netos — el producto más rentable del período`)
    if (bebidasCat) bullets.push(`<strong class="insight-highlight">BEBIDAS</strong> tiene ${bebidasCat.margin_pct}% de margen con solo ${fmtN(bebidasCat.count)} productos — la categoría más eficiente`)
    if (comidaCat) bullets.push(`<strong class="insight-highlight">COMIDA</strong> mueve ${fmt(comidaCat.revenue)} pero deja ${comidaCat.margin_pct}% de margen — volumen compensa, eficiencia 10 puntos bajo meta`)
    if (worstCat && worstCat.categoria !== bestCat?.categoria) bullets.push(`<strong class="insight-highlight">${worstCat.categoria}</strong> muestra solo ${worstCat.margin_pct}% de margen — la categoría más débil`)
    bullets.push(`El <strong class="insight-highlight">${mk.margin_pct.toFixed(1)}% de margen general</strong> supera la meta del 30% por ${(mk.margin_pct - 30).toFixed(0)} puntos`)
    const bulletsHtml = bullets.map(b=>`<div class="insight-item"><div class="insight-bullet">•</div><div class="insight-text">${b}</div></div>`).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Inteligencia operativa</div><div class="slide-title">Datos que<br>importan</div></div>
      <div class="insights-list">${bulletsHtml}</div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('DATOS QUE IMPORTAN')) }

  // ═══ SLIDE 8 — PARA LA JUNTA ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const bebidasCat = cats.find(c=>c.categoria.toUpperCase().includes('BEBID'))
    const drenaCount = margins!.drenan.length
    const bebidasMargin = bebidasCat ? `${bebidasCat.margin_pct}%` : '--'
    const tarjetas = [
      { icon:'✅', cls:'green', text:`<strong style="color:#5C7A4D">BEBIDAS lidera con ${bebidasMargin} margen</strong> — mantener precios actuales y duplicar promociones en horas pico (jueves-sábado 8pm-12am).`, action:'Acción inmediata · Bajo riesgo' },
      { icon:'⚠', cls:'yellow', text:`<strong style="color:#D4922A">${drenaCount} productos en el 5% inferior</strong> por ganancia neta — evaluar menú.`, action:'Evaluar en 14 días · Riesgo moderado' },
      { icon:'◉', cls:'borgona', text:`<strong style="color:#6B2737">Margen general ${mk.margin_pct.toFixed(1)}%</strong> — saludable, sobre meta del 30%. Revisar presupuesto Q3.`, action:'Planificar Q3 · Oportunidad' },
    ]
    const tarjetasHtml = tarjetas.map(t=>`<div class="junta-card ${t.cls}"><div class="junta-icon">${t.icon}</div><div class="junta-body"><div class="junta-text">${t.text}</div><div class="junta-action">${t.action}</div></div></div>`).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Recomendaciones</div><div class="slide-title">Para la<br>junta</div></div>
      <div class="junta-list">${tarjetasHtml}</div>
      <div style="margin-top:auto;text-align:center;padding-top:20px;border-top:1px solid rgba(62,39,35,0.1)"><div style="font-size:9px;color:#5C4037;letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Sans',sans-serif">Informe generado · Attick &amp; Keller · ${todayLabel}</div></div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('PARA LA JUNTA')) }

  // ═══ SLIDE 9 — ANÁLISIS IA ═══
  if (analysis && analysis.length > 10) {
    const sections = parseAnalysisSections(analysis)
    if (sections.length > 0) {
      const analysisBlocks = sections.slice(0, 5).map(s => {
        const body = s.body.replace(/\n/g, '<br>')
        return `<div class="analysis-block"><div class="analysis-title">${s.icon} ${s.title}</div><div class="analysis-body">${body}</div></div>`
      }).join('')
      slides.push(`<div class="slide">
        <div class="slide-header"><div class="slide-label">Análisis inteligente</div><div class="slide-title">Análisis<br>Rayo IA</div></div>
        <div class="analysis-wrap">${analysisBlocks}</div>
        <div class="watermark">A&amp;K · Confidencial</div>
      </div>`)
    }
  }

  // ═══ SLIDE 10 — RENTABILIDAD RESUMEN ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const catColors = { 'BEBIDAS':'#5C7A4D', 'COCTELES':'#6B2737', 'LICORES':'#C9A94E', 'COMIDA':'#A0522D', 'VINOS':'#D4922A' }
    const catBars = cats.map(c=>{
      const color = catColors[c.categoria.toUpperCase()] || '#6B2737'
      return `<div class="comp-row"><div class="comp-label" style="color:${color}">${c.categoria}</div><div class="comp-bar-area"><div class="comp-bar"><div class="comp-bar-fill" style="width:${c.margin_pct}%;background:${color}"><span class="comp-pct">${c.margin_pct}%</span></div></div><div class="comp-meta"><div class="comp-meta-item">Rev: <span class="comp-meta-val">${fmt(c.revenue)}</span></div><div class="comp-meta-item">SKU: <span class="comp-meta-val">${fmtN(c.count)}</span></div></div></div></div>`
    }).join('')
    slides.push(`<div class="slide">
      <div class="slide-header"><div class="slide-label">Rentabilidad operativa</div><div class="slide-title">Márgenes<br>por categoría</div></div>
      <div style="display:flex;gap:10px;margin-bottom:18px">
        <div style="flex:1;background:#FFFFFF;border-radius:10px;padding:14px;border:1px solid rgba(62,39,35,0.08)"><div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5C4037;margin-bottom:6px">Margen General</div><div style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:#6B2737;line-height:1">${mk.margin_pct.toFixed(1)}%</div><div style="font-size:10px;color:#5C7A4D;font-weight:600;margin-top:4px">+${(mk.margin_pct - 30).toFixed(0)}pp sobre meta</div></div>
        <div style="flex:1;background:#FFFFFF;border-radius:10px;padding:14px;border:1px solid rgba(62,39,35,0.08)"><div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#5C4037;margin-bottom:6px">Productos con Receta</div><div style="font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:#6B2737;line-height:1">${fmtN(mk.total_productos)}</div><div style="font-size:10px;color:#5C4037;font-weight:500;margin-top:4px">${fmtN(margins!.importan.length + margins!.drenan.length)} con margen real</div></div>
      </div>
      <div class="comp-list">${catBars}</div>
      <div style="margin-top:auto;padding-top:14px;border-top:1px solid rgba(62,39,35,0.1)"><div style="font-size:11px;line-height:1.5;color:#5C4037"><strong style="color:#6B2737">5 macrocategorías operacionales.</strong> ${fmtN(max(0, margins!.importan.length + margins!.drenan.length - mk.total_productos))} productos con receta sin ventas = ruido (excluidos).</div></div>
      <div class="watermark">A&amp;K · Confidencial</div>
    </div>`)
  } else { slides.push(emptySlide('RENTABILIDAD RESUMEN')) }



  // ── Assemble full HTML ──
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Caveat:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #F5EDE0;
    color: #3E2723;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    width: 450px;
  }

  .slide {
    width: 450px; height: 800px; overflow: hidden;
    position: relative; background: #F5EDE0;
    padding: 0 32px; display: flex; flex-direction: column;
  }
  .slide-header {
    margin: 0 -32px; padding: 20px 32px 16px;
    flex-shrink: 0;
  }
  .slide-label {
    font-family: 'DM Sans', sans-serif; font-size: 10px;
    font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #A0522D;
    margin-bottom: 6px;
  }
  .slide-title {
    font-family: 'Playfair Display', serif; font-size: 28px;
    font-weight: 700; color: #3E2723; line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .slide-subtitle {
    font-family: 'DM Sans', sans-serif; font-size: 11px;
    color: #5C4037; margin-top: 6px; margin-bottom: 14px;
  }
  .slide-footer {
    margin-top: auto; padding: 14px 0 16px;
    display: flex; justify-content: center;
    font-family: 'DM Sans', sans-serif; font-size: 8px;
    color: #5C4037; border-top: 1px solid rgba(62,39,35,0.1);
    letter-spacing: 1px; flex-shrink: 0;
  }
  .watermark {
    position: absolute; bottom: 14px; right: 22px;
    font-family: 'DM Sans', sans-serif; font-size: 9px;
    color: rgba(62,39,35,0.08); font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase;
    pointer-events: none;
  }
  .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; }
  .empty-msg { font-family: 'DM Sans', sans-serif; font-size: 14px; color: #5C4037; text-align: center; padding: 0 32px; }

  /* ═══ COVER ═══ */
  .slide-cover {
    background: #6B2737; justify-content: space-between;
    padding: 44px 36px 36px; color: #F5EDE0;
  }
  .cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-logo { font-family: 'Playfair Display', serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #C9A94E; }
  .cover-date { font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(245,237,224,0.55); font-weight: 400; }
  .cover-main { margin-top: auto; margin-bottom: auto; }
  .cover-script { font-family: 'Caveat', cursive; font-size: 32px; color: #D4B76A; margin-bottom: 10px; line-height: 1.15; font-weight: 500; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 900; color: #F5EDE0; line-height: 1.05; margin-bottom: 18px; letter-spacing: -0.02em; }
  .cover-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(245,237,224,0.65); line-height: 1.55; max-width: 300px; font-weight: 400; }
  .cover-footer { border-top: 1px solid rgba(201,169,78,0.3); padding-top: 18px; display: flex; justify-content: space-between; align-items: center; }
  .cover-period { font-family: 'DM Sans', sans-serif; font-size: 11px; color: #D4B76A; font-weight: 500; }
  .cover-page { font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(245,237,224,0.35); }

  /* ═══ METRICS ═══ */
  .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 4px; }
  .metric-card { background: #FFFFFF; border-radius: 10px; padding: 18px 14px; border: 1px solid rgba(62,39,35,0.08); box-shadow: 0 2px 8px rgba(62,39,35,0.04); }
  .metric-value { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #6B2737; line-height: 1; }
  .metric-delta { font-size: 10px; color: #5C7A4D; font-weight: 600; margin-top: 5px; font-family: 'DM Sans', sans-serif; }
  .metric-delta.negative { color: #A0522D; }
  .metric-name { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5C4037; margin-top: 10px; font-family: 'DM Sans', sans-serif; }

  /* ═══ DRENA ═══ */
  .drena-list { margin-top: 8px; }
  .drena-item { background: #FFFFFF; border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; border: 1px solid rgba(62,39,35,0.06); border-left: 4px solid #A0522D; box-shadow: 0 2px 6px rgba(62,39,35,0.03); }
  .drena-item.warning { border-left-color: #D4922A; }
  .drena-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .drena-name { font-size: 13px; font-weight: 600; color: #3E2723; font-family: 'DM Sans', sans-serif; }
  .drena-metric { font-size: 10px; color: #5C4037; font-weight: 500; font-family: 'DM Sans', sans-serif; }
  .drena-bar-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .drena-bar { flex: 1; height: 5px; background: #E8DCC8; border-radius: 3px; overflow: hidden; }
  .drena-bar-fill { height: 100%; border-radius: 3px; }
  .drena-pct { font-size: 10px; font-weight: 700; color: #5C4037; min-width: 32px; text-align: right; font-family: 'DM Sans', sans-serif; }
  .drena-insight { margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(62,39,35,0.1); }
  .drena-insight-text { font-size: 11px; line-height: 1.5; color: #5C4037; font-family: 'DM Sans', sans-serif; }
  .drena-insight-text strong { color: #A0522D; font-weight: 600; }

  /* ═══ IMPORTA ═══ */
  .importa-list { margin-top: 6px; }
  .importa-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(62,39,35,0.08); }
  .importa-rank { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #C9A94E; width: 28px; text-align: center; flex-shrink: 0; }
  .importa-info { flex: 1; min-width: 0; }
  .importa-name { font-size: 12px; font-weight: 600; color: #3E2723; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'DM Sans', sans-serif; }
  .importa-bar-wrap { margin-top: 5px; }
  .importa-bar { height: 5px; background: #E8DCC8; border-radius: 3px; overflow: hidden; }
  .importa-bar-fill { height: 100%; border-radius: 3px; }
  .importa-right { text-align: right; flex-shrink: 0; }
  .importa-rev { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #6B2737; }
  .importa-pct { font-size: 10px; color: #5C4037; font-weight: 500; margin-top: 2px; font-family: 'DM Sans', sans-serif; }

  /* ═══ COMPOSICIÓN ═══ */
  .comp-list { margin-top: 10px; }
  .comp-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .comp-label { width: 72px; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; flex-shrink: 0; font-family: 'DM Sans', sans-serif; }
  .comp-bar-area { flex: 1; }
  .comp-bar { height: 20px; background: #E8DCC8; border-radius: 5px; overflow: hidden; position: relative; }
  .comp-bar-fill { height: 100%; border-radius: 5px; display: flex; align-items: center; padding-right: 8px; justify-content: flex-end; }
  .comp-pct { font-size: 10px; font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-family: 'DM Sans', sans-serif; }
  .comp-meta { display: flex; gap: 12px; margin-top: 3px; padding-left: 2px; }
  .comp-meta-item { font-size: 9px; color: #5C4037; font-family: 'DM Sans', sans-serif; }
  .comp-meta-val { color: #3E2723; font-weight: 600; }

  /* ═══ ESTRELLAS vs LASTRE ═══ */
  .vs-container { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; flex: 1; }
  .vs-col { display: flex; flex-direction: column; }
  .vs-header { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(62,39,35,0.1); font-family: 'DM Sans', sans-serif; }
  .vs-header.stars { color: #5C7A4D; }
  .vs-header.lastre { color: #A0522D; }
  .vs-item { background: #FFFFFF; border-radius: 8px; padding: 10px; margin-bottom: 6px; border: 1px solid rgba(62,39,35,0.06); box-shadow: 0 1px 4px rgba(62,39,35,0.03); }
  .vs-name { font-size: 10px; font-weight: 600; color: #3E2723; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px; font-family: 'DM Sans', sans-serif; }
  .vs-bar-row { display: flex; align-items: center; gap: 6px; }
  .vs-bar { flex: 1; height: 4px; background: #E8DCC8; border-radius: 2px; overflow: hidden; }
  .vs-bar-fill { height: 100%; border-radius: 2px; }
  .vs-val { font-size: 9px; font-weight: 700; color: #5C4037; white-space: nowrap; font-family: 'DM Sans', sans-serif; }

  /* ═══ DATOS QUE IMPORTAN ═══ */
  .insights-list { margin-top: 14px; }
  .insight-item { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
  .insight-bullet { color: #C9A94E; font-size: 14px; line-height: 1; flex-shrink: 0; margin-top: 2px; font-family: 'Playfair Display', serif; }
  .insight-text { font-size: 13px; line-height: 1.6; color: #3E2723; font-family: 'DM Sans', sans-serif; }
  .insight-highlight { color: #6B2737; font-weight: 700; }

  /* ═══ PARA LA JUNTA ═══ */
  .junta-list { margin-top: 12px; display: flex; flex-direction: column; gap: 14px; }
  .junta-card { background: #FFFFFF; border-radius: 10px; padding: 16px; border-left: 4px solid; display: flex; gap: 12px; align-items: flex-start; box-shadow: 0 2px 8px rgba(62,39,35,0.04); }
  .junta-card.green { border-left-color: #5C7A4D; }
  .junta-card.yellow { border-left-color: #D4922A; }
  .junta-card.borgona { border-left-color: #6B2737; }
  .junta-icon { font-size: 20px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
  .junta-card.green .junta-icon { color: #5C7A4D; }
  .junta-card.yellow .junta-icon { color: #D4922A; }
  .junta-card.borgona .junta-icon { color: #6B2737; }
  .junta-body { flex: 1; }
  .junta-text { font-size: 13px; line-height: 1.5; color: #3E2723; font-family: 'DM Sans', sans-serif; }
  .junta-action { font-size: 10px; color: #5C4037; margin-top: 6px; font-weight: 600; font-family: 'DM Sans', sans-serif; }

  /* ═══ ANÁLISIS IA ═══ */
  .analysis-wrap { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
  .analysis-block { background: #FFFFFF; border-radius: 10px; padding: 14px 16px; border: 1px solid rgba(62,39,35,0.06); }
  .analysis-title { font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 700; color: #6B2737; margin-bottom: 6px; }
  .analysis-body { font-family: 'DM Sans', sans-serif; font-size: 11px; line-height: 1.6; color: #3E2723; }
</style>
</head>
<body>
${slides.join('\n')}
</body>
</html>`
}
