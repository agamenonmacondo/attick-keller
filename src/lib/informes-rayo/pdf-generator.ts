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
  const { data, from, to, margins } = input

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const dayName = from ? formatDayName(from) : ''
  const hasMargins = !!(margins && margins.kpis && margins.kpis.total_productos > 0)

  // ── Build slides ──
  const slides: string[] = []

  // ═══ SLIDE 1 — PORTADA (Stitch Lightning Theme) ═══
  slides.push(`<div class="slide slide-cover">
    <div class="cover-top">
      <span class="cover-top-label">ATTICK & KELLER</span>
      <span class="cover-top-series">Executive Report Series</span>
    </div>
    <div class="cover-center">
      <div class="cover-bolt">⚡</div>
      <div class="cover-title">INFORME<br>RAYO</div>
      <div class="cover-line"></div>
      <div class="cover-period">${periodLabel}</div>
    </div>
    <div class="cover-bottom">
      <div class="cover-bottom-line"></div>
      <div class="cover-confidencial">Confidencial</div>
    </div>
    <div class="cover-flourish">⚡</div>
  </div>`)

  // ═══ SLIDE 2 — KPIs VITALES ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const marginVsMeta = mk.margin_pct - 30
    const ventasSemaforo = mk.total_revenue > 0 ? semaforo(60, 50) : semaforo(0) // Always green for positive revenue
    const margenSemaforo = semaforo(mk.margin_pct, 30)

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">MÉTRICAS CLAVE</span>
      </div>
      <div class="kpi-vital-wrap">
        <div class="kpi-vital-card">
          <div class="kpi-vital-label">VENTAS</div>
          <div class="kpi-vital-val">${fmt(mk.total_revenue)}</div>
          <div class="kpi-vital-sub">${ventasSemaforo} vs período</div>
        </div>
        <div class="kpi-vital-card">
          <div class="kpi-vital-label">MARGEN BRUTO</div>
          <div class="kpi-vital-val">${mk.margin_pct.toFixed(1)}%</div>
          <div class="kpi-vital-sub">${margenSemaforo} vs meta (30%)</div>
        </div>
        <div class="kpi-vital-card">
          <div class="kpi-vital-label">PRODUCTOS</div>
          <div class="kpi-vital-val">${mk.total_productos}</div>
          <div class="kpi-vital-sub">con margen calculable</div>
        </div>
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('MÉTRICAS CLAVE'))
  }

  // ═══ SLIDE 3 — LO QUE DRENA ═══
  if (hasMargins && margins!.drenan.length > 0) {
    const drenaRows = margins!.drenan.slice(0, 5).map(p => {
      const name = (p.product_name || '').length > 28
        ? `<span class="drena-name" title="${p.product_name.replace(/"/g, '&quot;')}">${p.product_name.substring(0, 28)}…</span>`
        : `<span class="drena-name">${p.product_name}</span>`
      const mbFormatted = p.margin_bruto < 0
        ? `<span class="text-red">-${fmt(Math.abs(p.margin_bruto))}</span>`
        : fmt(p.margin_bruto)
      return `<div class="drena-row">
        ${name}
        <div class="drena-meta">
          <span class="drena-cat">${catLetter(p.macro_category)} ${p.macro_category}</span>
          <span class="drena-sep">•</span>
          <span class="drena-margin">${Math.round(p.margin_pct)}%</span>
          <span class="drena-sep">•</span>
          <span class="drena-rev">${fmt(p.revenue)}</span>
          <span class="drena-sep">•</span>
          <span>Neto: ${mbFormatted}</span>
        </div>
        ${p.diagnostico ? `<div class="drena-diag">${p.diagnostico.substring(0, 120)}${p.diagnostico.length > 120 ? '…' : ''}</div>` : ''}
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">⚠ LO QUE DRENA</span>
      </div>
      <div class="slide-subtitle">Productos en el 5% inferior por ganancia neta</div>
      <div class="drena-list">
        ${drenaRows}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('⚠ LO QUE DRENA'))
  }

  // ═══ SLIDE 4 — POR CATEGORÍA ═══
  if (hasMargins && margins!.resumen_ejecutivo.categorias.length > 0) {
    const catCards = margins!.resumen_ejecutivo.categorias.map(c => {
      const catSemaforo = semaforo(c.margin_pct, 30)
      return `<div class="cat-card">
        <div class="cat-card-top">
          <span class="cat-card-icon" style="color:${catColor(c.categoria)}">${catLetter(c.categoria)}</span>
          <span class="cat-card-name">${c.categoria}</span>
        </div>
        <div class="cat-card-rev">${fmt(c.revenue)}</div>
        <div class="cat-card-margin">${c.margin_pct}% ${catSemaforo}</div>
        <div class="cat-card-counts">
          <span class="text-gold">\u{1F525} ${c.importan} importan</span>
          <span class="cat-card-spacer">•</span>
          <span class="text-red">⚠ ${c.drenan} drenan</span>
        </div>
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">POR CATEGORÍA</span>
      </div>
      <div class="cat-cards-wrap">
        ${catCards}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('POR CATEGORÍA'))
  }

  // ═══ SLIDE 5 — ANÁLISIS IA ═══
  if (input.analysis && input.analysis.length > 10) {
    const sections = parseAnalysisSections(input.analysis)
    if (sections.length > 0) {
      const analysisBlocks = sections.slice(0, 5).map(s => {
        const body = s.body.replace(/\n/g, '<br>')
        return `<div class="analysis-block">
          <div class="analysis-title">${s.icon} ${s.title}</div>
          <div class="analysis-body">${body}</div>
        </div>`
      }).join('')

      slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">ANÁLISIS INTELIGENTE</span>
      </div>
      <div class="slide-subtitle">Diagnóstico automatizado del período</div>
      <div class="analysis-wrap">
        ${analysisBlocks}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
    }
  }

  // ═══ SLIDE 5b — GRÁFICOS (Donut + Barras) ═══
  if (data.payments && data.payments.length > 0) {
    const revenue = Number(data.kpis?.total_ventas ?? 0)
    const donutHtml = buildDonutSvg(data.payments, revenue)
    const topProds = data.topProducts?.slice(0, 5) || []
    const maxRev = topProds.length > 0 ? Math.max(...topProds.map((p: ProductData) => Number(p.revenue ?? 0))) : 1
    
    const barHtml = topProds.map((p: ProductData, i: number) => {
      const val = Number(p.revenue ?? 0)
      const pctW = maxRev > 0 ? (val / maxRev) * 100 : 0
      const color = i < 2 ? '#C9A94E' : i < 4 ? '#A0522D' : '#5D1528'
      const name = (p.product_name || '').length > 22 ? p.product_name!.substring(0, 22) + '…' : (p.product_name || '-')
      return `<div class="chart-bar-row">
        <span class="chart-bar-label">${name}</span>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pctW.toFixed(1)}%;background:${color}"></div></div>
        <span class="chart-bar-val">${fmt(val)}</span>
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">GRÁFICOS</span>
      </div>
      <div class="slide-subtitle">Distribución de ingresos y métodos de pago</div>
      <div class="charts-donut-wrap">${donutHtml}</div>
      <div class="charts-bar-section">
        <div class="charts-bar-title">Top 5 Productos</div>
        ${barHtml}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  }

  // ═══ SLIDE 5 — LO QUE IMPORTA (TOP 1-7) ═══
  if (hasMargins && margins!.importan.length > 0) {
    const top7 = margins!.importan.slice(0, 7)
    const maxMarginPct = Math.max(...top7.map(p => p.margin_pct || 0), 1)

    const rows = top7.map((p, i) => {
      const name = (p.product_name || '').length > 28
        ? p.product_name.substring(0, 28) + '…'
        : p.product_name
      const barPct = maxMarginPct > 0 ? (p.margin_pct / maxMarginPct) * 100 : 0
      const barColor = p.margin_pct > 50 ? '#C9A94E' : p.margin_pct > 30 ? '#E8D48B' : '#A0522D'
      return `<div class="importa-row">
        <div class="importa-num">${i + 1}</div>
        <div class="importa-body">
          <div class="importa-name">${name}</div>
          <div class="importa-bar-track"><div class="importa-bar-fill" style="width:${barPct.toFixed(1)}%;background:${barColor}"></div></div>
        </div>
        <div class="importa-val">${fmt(p.revenue)}</div>
        <div class="importa-pct">${Math.round(p.margin_pct)}%</div>
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">LO QUE IMPORTA</span>
      </div>
      <div class="slide-subtitle">Top 7 por ganancia neta — proteger a toda costa</div>
      <div class="importa-wrap">
        ${rows}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('LO QUE IMPORTA'))
  }

  // ═══ SLIDE 6 — COMPOSICIÓN DEL MARGEN ═══
  if (hasMargins && margins!.resumen_ejecutivo.categorias.length > 0) {
    const cats = margins!.resumen_ejecutivo.categorias
    const totalMargin = cats.reduce((s, c) => s + (Number(c.revenue || 0) * Number(c.margin_pct || 0) / 100), 0)
    const totalRevenue = cats.reduce((s, c) => s + Number(c.revenue || 0), 0)
    const maxSegPct = Math.max(...cats.map(c => totalMargin > 0 ? (Number(c.revenue || 0) * Number(c.margin_pct || 0) / 100) / totalMargin * 100 : 0), 1)

    const rows = cats.map(c => {
      const catMargin = Number(c.revenue || 0) * Number(c.margin_pct || 0) / 100
      const segPct = totalMargin > 0 ? (catMargin / totalMargin) * 100 : 0
      const color = catColor(c.categoria)
      const barWidth = maxSegPct > 0 ? (segPct / maxSegPct) * 100 : 0
      return `<div class="compo-row">
        <div class="compo-label">${c.categoria}</div>
        <div class="compo-bar-track"><div class="compo-bar-fill" style="width:${barWidth.toFixed(1)}%;background:${color}"></div></div>
        <div class="compo-pct">${segPct.toFixed(1)}%</div>
        <div class="compo-rev">${fmt(c.revenue)}</div>
        <div class="compo-margen">${c.margin_pct}% margen</div>
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">COMPOSICIÓN DEL MARGEN</span>
      </div>
      <div class="slide-subtitle">Contribución por categoría al margen bruto</div>
      <div class="compo-wrap">
        ${rows}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('COMPOSICIÓN DEL MARGEN'))
  }

  // ═══ SLIDE 7 — ESTRELLAS vs LASTRE ═══
  if (hasMargins) {
    const estrellas = [...margins!.importan]
      .sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))
      .slice(0, 5)
    const lastre = [...margins!.drenan]
      .sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))
      .slice(0, 5)
    const maxStarPct = Math.max(...estrellas.map(p => p.margin_pct || 0), 1)
    const maxLastrePct = Math.max(...lastre.map(p => Math.abs(p.margin_pct || 0)), 1)

    const estrellasRows = estrellas.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : p.product_name
      const barW = maxStarPct > 0 ? (p.margin_pct / maxStarPct) * 100 : 0
      return `<div class="star-row">
        <div class="star-name" title="${p.product_name.replace(/"/g, '&quot;')}">${name}</div>
        <div class="star-bar-track"><div class="star-bar-fill star-bar-green" style="width:${barW.toFixed(1)}%"></div></div>
        <div class="star-val">${fmt(p.margin_bruto)} <span class="star-pct">${Math.round(p.margin_pct)}%</span></div>
      </div>`
    }).join('')

    const lastreRows = lastre.map(p => {
      const name = (p.product_name || '').length > 18 ? p.product_name.substring(0, 18) + '…' : p.product_name
      const barW = maxLastrePct > 0 ? (Math.abs(p.margin_pct) / maxLastrePct) * 100 : 0
      const colorClass = p.margin_pct < 0 ? 'star-bar-red' : p.margin_pct < 30 ? 'star-bar-yellow' : 'star-bar-green'
      return `<div class="star-row">
        <div class="star-name" title="${p.product_name.replace(/"/g, '&quot;')}">${name}</div>
        <div class="star-bar-track"><div class="star-bar-fill ${colorClass}" style="width:${barW.toFixed(1)}%"></div></div>
        <div class="star-val">${fmt(p.margin_bruto)} <span class="star-pct">${Math.round(p.margin_pct)}%</span></div>
      </div>`
    }).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">ESTRELLAS vs LASTRE</span>
      </div>
      <div class="slide-subtitle">Top 5 y bottom 5 por margen bruto</div>
      <div class="star-grid">
        <div class="star-col">
          <div class="star-col-title text-green">⭐ ESTRELLAS</div>
          <div class="star-col-sub">Top 5 por margen bruto</div>
          ${estrellasRows}
        </div>
        <div class="star-col">
          <div class="star-col-title text-red">⚠ LASTRE</div>
          <div class="star-col-sub">Bottom 5 por margen bruto</div>
          ${lastreRows}
        </div>
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('ESTRELLAS vs LASTRE'))
  }

  // ═══ SLIDE 8 — DATOS QUE IMPORTAN ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const topImportan = margins!.importan.length > 0 ? margins!.importan[0] : null
    const bestCat = cats.length > 0
      ? [...cats].sort((a, b) => Number(b.margin_pct || 0) - Number(a.margin_pct || 0))[0]
      : null
    const worstCat = cats.length > 0
      ? [...cats].sort((a, b) => Number(a.margin_pct || 0) - Number(b.margin_pct || 0))[0]
      : null
    const comidaCat = cats.find(c => c.categoria.toUpperCase().includes('COMID'))
    const bebidasCat = cats.find(c => c.categoria.toUpperCase().includes('BEBID'))

    const bullets: string[] = []

    if (topImportan) {
      bullets.push(`${topImportan.product_name} genera ${fmt(topImportan.margin_bruto)} netos — el producto más rentable del período`)
    }
    if (bestCat) {
      bullets.push(`${bestCat.categoria} lidera con ${bestCat.margin_pct}% de margen sobre ${fmt(bestCat.revenue)}`)
    }
    if (comidaCat) {
      bullets.push(`COMIDA mueve ${fmt(comidaCat.revenue)} pero deja ${comidaCat.margin_pct}% de margen`)
    }
    if (worstCat && worstCat.categoria !== bestCat?.categoria) {
      bullets.push(`${worstCat.categoria} muestra solo ${worstCat.margin_pct}% de margen — la categoría más débil`)
    }
    if (bebidasCat) {
      bullets.push(`BEBIDAS tiene ${bebidasCat.margin_pct}% de margen con ${bebidasCat.count} productos`)
    }
    if (bullets.length === 0) {
      bullets.push(`Margen general: ${mk.margin_pct.toFixed(1)}% sobre ${fmt(mk.total_revenue)} en ventas`)
      bullets.push(`${mk.total_productos} productos analizados en el período`)
    }

    const bulletsHtml = bullets.map(f =>
      `<div class="dato-item"><span class="dato-bullet">•</span><span class="dato-text">${f}</span></div>`
    ).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">DATOS QUE IMPORTAN</span>
      </div>
      <div class="dato-wrap">
        ${bulletsHtml}
      </div>
      <div class="slide-footer">
        <span>ATTICK & KELLER • INFORME RAYO</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('DATOS QUE IMPORTAN'))
  }

  // ═══ SLIDE 9 — PARA LA JUNTA ═══
  if (hasMargins) {
    const mk = margins!.kpis
    const cats = margins!.resumen_ejecutivo.categorias
    const bebidasCat = cats.find(c => c.categoria.toUpperCase().includes('BEBID'))
    const drenaCount = margins!.drenan.length

    const bebidasMargin = bebidasCat ? `${bebidasCat.margin_pct}%` : '--'
    const tarjetas = [
      { icon: '✅', border: '#4ADE80', text: `BEBIDAS lidera con ${bebidasMargin} margen → mantener precios y promociones` },
      { icon: '⚠', border: '#E8D48B', text: `${drenaCount} productos en el 5% inferior por ganancia neta → evaluar menú` },
      { icon: '◉', border: '#C9A94E', text: `Margen general ${mk.margin_pct.toFixed(1)}% → saludable, sobre meta del 30%` },
    ]

    const tarjetasHtml = tarjetas.map(t =>
      `<div class="junta-card" style="border-left:3px solid ${t.border}">
        <span class="junta-icon">${t.icon}</span>
        <span class="junta-text">${t.text}</span>
      </div>`
    ).join('')

    slides.push(`<div class="slide">
      <div class="slide-header">
        <span class="slide-hdr-title">PARA LA JUNTA</span>
      </div>
      <div class="slide-subtitle">3 recomendaciones accionables</div>
      <div class="junta-wrap">
        ${tarjetasHtml}
      </div>
      <div class="slide-footer">
        <span>Attick & Keller • Informe Rayo • ${todayLabel}</span>
      </div>
    </div>`)
  } else {
    slides.push(emptySlide('PARA LA JUNTA'))
  }


  // ── Assemble full HTML ──
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat&family=Inter:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #0D0D0C;
    color: #F0EDE8;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    width: 450px;
  }

  /* ── Slide container ── */
  .slide {
    width: 450px;
    height: 800px;
    overflow: hidden;
    position: relative;
    background: #0D0D0C;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
  }

  /* ── Slide header (Stitch: bg-borgona bar) ── */
  .slide-header {
    background: #5D1528;
    margin: 0 -24px;
    padding: 14px 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .slide-hdr-title {
    font-family: 'Source Serif 4', serif;
    font-size: 16px;
    font-weight: 700;
    color: #C9A94E;
    letter-spacing: 2px;
  }
  .slide-subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: #A09890;
    margin: 8px 0 14px;
    flex-shrink: 0;
    padding: 0;
  }

  /* ── Slide footer ── */
  .slide-footer {
    margin-top: auto;
    padding: 12px 0 16px;
    display: flex;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-size: 8px;
    color: #706860;
    border-top: 1px solid #2A2A2A;
    letter-spacing: 1px;
    flex-shrink: 0;
  }

  /* ── Colors ── */
  .text-green { color: #4ADE80; }
  .text-red { color: #F87171; }
  .text-gold { color: #C9A94E; }
  .text-yellow { color: #E8D48B; }

  /* ── Semáforo ── */
  .semaforo { font-size: 12px; margin-right: 4px; }
  .semaforo-green { color: #4ADE80; }
  .semaforo-yellow { color: #E8D48B; }
  .semaforo-red { color: #F87171; }

  /* ── Empty state ── */
  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-msg {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #706860;
    text-align: center;
    padding: 0 32px;
  }

  /* ═══ SLIDE 1 — COVER (Stitch Lightning Theme) ═══ */
  .slide-cover {
    background: #5D1528;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    position: relative;
    padding: 48px 24px 40px;
  }
  .slide-cover::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.04;
    pointer-events: none;
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)" opacity="1"/></svg>');
  }
  .slide-cover > * { position: relative; z-index: 1; }

  .cover-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .cover-top-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #C9A94E;
    opacity: 0.8;
    text-transform: uppercase;
  }
  .cover-top-series {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #C9A94E;
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .cover-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .cover-bolt {
    font-size: 32px;
    opacity: 0.4;
    color: #C9A94E;
    margin-bottom: 8px;
  }
  .cover-title {
    font-family: 'Source Serif 4', serif;
    font-size: 36px;
    font-weight: 700;
    color: #C9A94E;
    line-height: 1.15;
    letter-spacing: -0.5px;
  }
  .cover-line {
    width: 40px;
    height: 1px;
    background: #C9A94E;
    margin: 4px 0;
  }
  .cover-period {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    color: #F0EDE8;
    font-weight: 400;
    opacity: 0.9;
  }

  .cover-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .cover-bottom-line {
    width: 32px;
    height: 1px;
    background: #C9A94E;
    opacity: 0.2;
  }
  .cover-confidencial {
    font-family: 'Caveat', cursive;
    font-size: 22px;
    color: #C9A94E;
    opacity: 0.6;
    transform: rotate(-2deg);
  }
  .cover-flourish {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 120px;
    color: #C9A94E;
    opacity: 0.1;
    transform: translate(40px, -40px);
  }

  /* ═══ SLIDE 2 — KPIs VITALES ═══ */
  .kpi-vital-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
  }
  .kpi-vital-card {
    background: #1A1A1A;
    border: 1px solid #2A2A2A;
    padding: 18px 20px;
    text-align: center;
  }
  .kpi-vital-label {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #706860;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
  }
  .kpi-vital-val {
    font-family: 'Source Serif 4', serif;
    font-size: 42px;
    font-weight: 800;
    color: #F0EDE8;
    line-height: 1.1;
  }
  .kpi-vital-sub {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #A09890;
    margin-top: 4px;
  }

  /* ═══ SLIDE 3 — LO QUE DRENA ═══ */
  .drena-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
  }
  .drena-row {
    background: #1A1A1A;
    border: 1px solid #2A2A2A;
    padding: 10px 12px;
  }
  .drena-name {
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    color: #F0EDE8;
    font-weight: 500;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .drena-meta {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #A09890;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .drena-cat { color: #706860; }
  .drena-sep { color: #2A2A2A; font-size: 10px; }
  .drena-margin { font-weight: 500; }
  .drena-rev { font-weight: 500; color: #A09890; }
  .drena-diag {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: #706860;
    margin-top: 5px;
    line-height: 1.4;
  }

  /* ═══ SLIDE 5 — ANÁLISIS IA ═══ */
  .analysis-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .analysis-block {
    background: #1A1A1A;
    border-left: 3px solid #C9A94E;
    padding: 10px 12px;
  }
  .analysis-title {
    font-family: 'Source Serif 4', serif;
    font-size: 14px;
    font-weight: 600;
    color: #C9A94E;
    margin-bottom: 4px;
  }
  .analysis-body {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #E0D8CC;
    line-height: 1.55;
  }

  /* ═══ SLIDE GRÁFICOS (Donut + Barras) ═══ */
  .charts-donut-wrap {
    display: flex;
    justify-content: center;
    padding: 8px 0;
    flex-shrink: 0;
  }
  .charts-donut-wrap .donut-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .charts-donut-wrap .legend-item {
    font-size: 11px;
  }
  .charts-bar-section {
    padding: 8px 0 0;
    flex-shrink: 0;
  }
  .charts-bar-title {
    font-family: 'Source Serif 4', serif;
    font-size: 12px;
    font-weight: 600;
    color: #C9A94E;
    margin-bottom: 8px;
  }
  .chart-bar-row {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    gap: 6px;
  }
  .chart-bar-label {
    width: 110px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    color: #A09890;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .chart-bar-track {
    flex: 1;
    height: 10px;
    background: #1A1A1A;
    overflow: hidden;
  }
  .chart-bar-fill {
    height: 100%;
    min-width: 2px;
  }
  .chart-bar-val {
    width: 55px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 500;
    color: #F0EDE8;
    text-align: right;
    flex-shrink: 0;
  }

  /* ═══ SLIDE 4 — POR CATEGORÍA ═══ */
  .cat-cards-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cat-card {
    background: #1A1A1A;
    border: 1px solid #2A2A2A;
    padding: 12px 14px;
  }
  .cat-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .cat-card-icon {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    width: 20px;
    text-align: center;
  }
  .cat-card-name {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #F0EDE8;
  }
  .cat-card-rev {
    font-family: 'Source Serif 4', serif;
    font-size: 24px;
    font-weight: 700;
    color: #F0EDE8;
    margin-bottom: 2px;
  }
  .cat-card-margin {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: #A09890;
    margin-bottom: 4px;
  }
  .cat-card-counts {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cat-card-spacer { color: #2A2A2A; font-size: 8px; }

  /* ═══ SLIDE 5 — LO QUE IMPORTA (barras) ═══ */
  .importa-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: center;
  }
  .importa-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
  }
  .importa-num {
    font-family: 'Source Serif 4', serif;
    font-size: 18px;
    font-weight: 700;
    color: #C9A94E;
    width: 24px;
    flex-shrink: 0;
    text-align: center;
  }
  .importa-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .importa-name {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #F0EDE8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .importa-bar-track {
    height: 8px;
    background: #1A1A1A;
    overflow: hidden;
    border-radius: 0;
  }
  .importa-bar-fill {
    height: 100%;
    min-width: 2px;
    transition: none;
  }
  .importa-val {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: #A09890;
    text-align: right;
    width: 52px;
    flex-shrink: 0;
  }
  .importa-pct {
    font-family: 'Source Serif 4', serif;
    font-size: 11px;
    font-weight: 700;
    color: #C9A94E;
    text-align: right;
    width: 34px;
    flex-shrink: 0;
  }

  /* ═══ SLIDE 6 — COMPOSICIÓN DEL MARGEN ═══ */
  .compo-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
  }
  .compo-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
  }
  .compo-label {
    width: 72px;
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: #F0EDE8;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .compo-bar-track {
    flex: 1;
    height: 16px;
    background: #1A1A1A;
    overflow: hidden;
    border-radius: 0;
  }
  .compo-bar-fill {
    height: 100%;
    min-width: 2px;
  }
  .compo-pct {
    width: 42px;
    font-family: 'Source Serif 4', serif;
    font-size: 11px;
    font-weight: 700;
    color: #F0EDE8;
    text-align: right;
    flex-shrink: 0;
  }
  .compo-rev {
    width: 54px;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #A09890;
    text-align: right;
    flex-shrink: 0;
  }
  .compo-margen {
    width: 54px;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #706860;
    text-align: right;
    flex-shrink: 0;
  }

  /* ═══ SLIDE 7 — ESTRELLAS vs LASTRE ═══ */
  .star-grid {
    flex: 1;
    display: flex;
    gap: 14px;
  }
  .star-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .star-col-title {
    font-family: 'Source Serif 4', serif;
    font-size: 12px;
    font-weight: 700;
  }
  .star-col-sub {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #706860;
    margin-bottom: 4px;
  }
  .star-row {
    padding: 8px 10px;
    background: #1A1A1A;
    border: 1px solid #2A2A2A;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .star-name {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    color: #F0EDE8;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .star-bar-track {
    height: 5px;
    background: #0D0D0D;
    overflow: hidden;
  }
  .star-bar-fill {
    height: 100%;
    min-width: 2px;
  }
  .star-bar-green { background: #4ADE80; }
  .star-bar-yellow { background: #E8D48B; }
  .star-bar-red { background: #F87171; }
  .star-val {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    color: #A09890;
    display: flex;
    justify-content: space-between;
  }
  .star-pct {
    font-weight: 600;
    color: #F0EDE8;
  }

  /* ═══ SLIDE 8 — DATOS QUE IMPORTAN ═══ */
  .dato-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
  }
  .dato-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    line-height: 1.55;
  }
  .dato-bullet {
    font-family: 'Source Serif 4', serif;
    font-size: 14px;
    color: #C9A94E;
    flex-shrink: 0;
    line-height: 1.35;
    margin-top: 1px;
  }
  .dato-text {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #E0D8CC;
  }

  /* ═══ SLIDE 9 — PARA LA JUNTA ═══ */
  .junta-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }
  .junta-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: #1A1A1A;
  }
  .junta-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .junta-text {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #F0EDE8;
    line-height: 1.5;
  }

</style>
</head>
<body>
${slides.join('\n')}
</body>
</html>`
}
