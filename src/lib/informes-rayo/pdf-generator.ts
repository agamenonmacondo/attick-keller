// ═══ A&K Informes Rayo — PDF HTML Generator (Editorial Premium Theme) ═══
// Design system: Playfair Display (titles) + DM Sans (body) + Caveat (script)
// A&K palette: borgona #5D1528, dorado #C9A94E, ladrillo #A0522D
// Self-contained HTML designed for html2canvas + jsPDF rendering

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

interface PDFGeneratorInput {
  data: ReportData
  from: string
  to: string
  analysis?: string | null
  productHourly?: ProductHourlyItem[]
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

function hourLabel(h: number): string {
  return `${h}h`
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
    .slice(0, 15)

  const hours = [...hourSet].sort((a, b) => a - b)
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
  const sections: AnalysisSection[] = []
  // Split on emoji-prefixed headers: ⚡ 📊 🏆 💡 ⚠️ 📋
  const parts = analysis.split(/\n(?=[⚡📊🏆💡⚠️📋])/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const nl = trimmed.indexOf('\n')
    const headerLine = nl > 0 ? trimmed.substring(0, nl).trim() : trimmed
    const body = nl > 0 ? trimmed.substring(nl + 1).trim() : ''
    // Extract icon (first char) and title (remove ** markers)
    const icon = headerLine.charAt(0)
    const title = headerLine.slice(1).replace(/\*\*/g, '').trim()
    sections.push({ icon, title, body })
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

// ── SVG Donut Chart (A&K colors: borgona, dorado, ladrillo) ──
function buildDonutSvg(payments: PaymentData[], total: number): string {
  const colors = ['#C9A94E', '#5D1528', '#A0522D']
  const labels = ['Efectivo', 'Tarjeta', 'Transferencia']
  let cumulative = 0
  let slices = ''
  const cx = 100, cy = 85, r = 68, inner = 44

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
    <svg width="200" height="170" viewBox="0 0 200 170">
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="${inner}" fill="#0D0D0D"/>
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#F0EDE8" font-family="DM Sans, sans-serif" font-size="24" font-weight="700">${dominantPct}%</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#A09890" font-family="DM Sans, sans-serif" font-size="9">método líder</text>
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

export function generatePDFHtml(input: PDFGeneratorInput): string {
  const { data, from, to, analysis, productHourly } = input
  const { kpis, zones, payments, topProducts, comparison } = data

  const revenue = Number(kpis?.total_ventas ?? 0)
  const cheques = Number(kpis?.total_cheques ?? 0)
  const personas = Number(kpis?.personas ?? 0)
  const propina = Number(kpis?.propina_total ?? 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const propinaPer = personas > 0 ? Math.round(propina / personas) : 0
  const eff = personas > 0 ? Math.round((cheques / personas) * 100) : 0

  const cKpi = comparison?.kpis
  const cRevenue = cKpi ? Number(cKpi.total_ventas ?? 0) : 0
  const cCheques = cKpi ? Number(cKpi.total_cheques ?? 0) : 0
  const cPersonas = cKpi ? Number(cKpi.personas ?? 0) : 0
  const cPropina = cKpi ? Number(cKpi.propina_total ?? 0) : 0
  const cTicketProm = cKpi && cCheques > 0 ? Math.round(cRevenue / cCheques) : 0
  const cPropinaPer = cKpi && cPersonas > 0 ? Math.round(cPropina / cPersonas) : 0

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const dayName = from ? formatDayName(from) : ''

  const maxRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: ProductData) => Number(p.revenue ?? 0))) : 1

  // ── Donut ──
  let donutHtml = ''
  if (payments.length > 0) {
    donutHtml = buildDonutSvg(payments, revenue)
  }

  // ── Category summary ──
  const categories = topProducts.length > 0 ? buildCategorySummary(topProducts) : []
  const maxCatRev = categories.length > 0 ? Math.max(...categories.map(c => c.revenue)) : 1

  // ── Analysis sections ──
  const analysisSections = analysis ? parseAnalysisSections(analysis) : []

  // ── Product hourly ──
  let hourlySection = ''
  if (productHourly && productHourly.length > 0) {
    const { products, hours, grandTotal } = buildProductHourlyTable(productHourly)
    const maxHour = products.length > 0 ? Math.max(...hours) : 23
    const displayProducts = products.slice(0, 12)
    const maxVal = displayProducts.length > 0 ? Math.max(...displayProducts.map(p => p.totalRevenue)) : 1

    let headerRow = '<th class="hm-prod">Producto</th>'
    for (let h = 0; h <= maxHour; h++) {
      if (hours.includes(h)) headerRow += `<th>${h}h</th>`
    }
    headerRow += '<th class="hm-total">Total</th>'

    let bodyRows = ''
    for (const prod of displayProducts) {
      let row = `<td class="hm-prod">${prod.name}</td>`
      for (let h = 0; h <= maxHour; h++) {
        const v = prod.hourly.get(h) ?? 0
        if (hours.includes(h)) {
          const intensity = v > 0 ? 0.08 + (v / maxVal) * 0.42 : 0
          row += `<td style="background:rgba(201,169,78,${intensity.toFixed(2)})">${v > 0 ? fmt(v) : ''}</td>`
        }
      }
      row += `<td class="hm-total">${fmt(prod.totalRevenue)}</td>`
      bodyRows += `<tr>${row}</tr>`
    }

    hourlySection = `<div class="page">
  <div class="page-header">
    <span class="page-hdr-brand">A&K • PRODUCTO × HORA</span>
    <span class="page-hdr-period">${periodLabel}</span>
  </div>
  <div class="sec">
    <h2 class="sec-title">Productos × Hora</h2>
    <p class="sec-desc">Distribución horaria de ingresos por producto (top 12)</p>
    <div class="hm-wrap">
      <table class="hm-table">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  </div>
  <div class="page-footer">
    <span>PÁGINA ${productHourly ? '5' : '4'}</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>`
  }

  const pageNum4 = productHourly ? '4' : '4'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap');

  :root {
    --bg: #0D0D0D;
    --bg-card: #1A1A1A;
    --gold: #C9A94E;
    --gold-light: #E8D48B;
    --borgona: #5D1528;
    --ladrillo: #A0522D;
    --text: #F0EDE8;
    --text-secondary: #A09890;
    --text-muted: #706860;
    --border: #2A2A2A;
    --border-light: #1F1F1F;
    --green: #4ADE80;
    --red: #F87171;
  }

  @page { size: A4 portrait; margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; -webkit-font-smoothing: antialiased; }

  .page { width: 210mm; min-height: 297mm; padding: 16mm 15mm 20mm; position: relative; overflow: hidden; page-break-after: always; background: var(--bg); }
  .page:last-child { page-break-after: auto; }

  /* ── Page Header ── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 16px; }
  .page-hdr-brand { font-family: 'Playfair Display', serif; font-size: 9px; color: var(--gold); letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600; }
  .page-hdr-period { font-size: 9px; color: var(--text-secondary); font-family: 'DM Sans', sans-serif; }

  /* ── Cover ── */
  .page-cover { background: linear-gradient(155deg, #1A0A10 0%, #5D1528 30%, #3E101C 60%, #0D0D0D 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .cover-frame { border: 1px solid rgba(201,169,78,0.25); padding: 52px 44px; position: relative; }
  .cover-frame::before { content: ''; position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px; border: 1px solid rgba(201,169,78,0.08); }
  .cover-brand-top { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: var(--text); }
  .cover-amp { font-family: 'Caveat', cursive; font-size: 44px; color: var(--gold); font-weight: 600; margin: 0 2px; line-height: 1; }
  .cover-sub-brand { font-family: 'DM Sans', sans-serif; font-size: 10px; color: var(--gold); letter-spacing: 7px; text-transform: uppercase; font-weight: 500; margin-bottom: 28px; margin-top: 6px; }
  .cover-line { width: 90px; height: 1px; background: var(--gold); margin: 0 auto 28px; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 50px; font-weight: 900; color: var(--text); letter-spacing: 1px; margin-bottom: 4px; }
  .cover-subtitle { font-family: 'DM Sans', sans-serif; font-size: 10px; color: var(--text-muted); letter-spacing: 5px; text-transform: uppercase; margin-bottom: 24px; }
  .cover-period { font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .cover-day { font-family: 'Caveat', cursive; font-size: 18px; color: var(--gold); margin-top: 6px; }
  .cover-footer { position: absolute; bottom: 18mm; font-size: 8px; color: rgba(160,152,144,0.5); letter-spacing: 2.5px; font-family: 'DM Sans', sans-serif; text-transform: uppercase; }

  /* ── Hero KPI ── */
  .hero { text-align: center; padding: 18px 0 14px; border-bottom: 1px solid var(--gold); margin-bottom: 16px; }
  .hero-val { font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 800; color: var(--gold-light); letter-spacing: 0; }
  .hero-lbl { font-family: 'DM Sans', sans-serif; font-size: 10px; color: var(--text-muted); letter-spacing: 4px; text-transform: uppercase; margin-top: 2px; font-weight: 500; }
  .hero-chg { font-size: 11px; margin-top: 4px; font-family: 'DM Sans', sans-serif; font-weight: 500; }

  /* ── KPI Grid 3×2 ── */
  .kpi-grid { display: flex; flex-wrap: wrap; margin: 0 -5px 10px; }
  .kpi-card { width: 31.33%; margin: 0 1% 8px; background: var(--bg-card); border: 1px solid var(--border); padding: 12px 10px; }
  .kpi-lbl { font-family: 'DM Sans', sans-serif; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; font-weight: 500; }
  .kpi-val { font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); }
  .kpi-chg { font-family: 'DM Sans', sans-serif; font-size: 10px; margin-top: 1px; font-weight: 500; }

  /* ── Sections ── */
  .sec { margin-bottom: 14px; }
  .sec-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: var(--gold); letter-spacing: 0.5px; border-bottom: 1px solid var(--border); padding-bottom: 5px; margin-bottom: 8px; }
  .sec-desc { font-family: 'DM Sans', sans-serif; font-size: 9px; color: var(--text-muted); margin-bottom: 10px; margin-top: -4px; }

  /* ── Donut ── */
  .donut-wrap { display: flex; align-items: center; gap: 24px; padding: 4px 0; }
  .donut-legend { display: flex; flex-direction: column; gap: 10px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 10px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .legend-label { color: var(--text-secondary); min-width: 80px; }
  .legend-val { font-weight: 600; color: var(--text); min-width: 60px; text-align: right; }
  .legend-pct { color: var(--text-muted); font-size: 9px; min-width: 30px; text-align: right; }

  /* ── Bars ── */
  .bar-row { display: flex; align-items: center; margin-bottom: 5px; }
  .bar-label { width: 135px; color: var(--text-secondary); font-family: 'DM Sans', sans-serif; font-size: 9px; text-align: right; padding-right: 8px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 10px; background: var(--border-light); overflow: hidden; }
  .bar-fill { height: 100%; min-width: 2px; transition: none; }
  .bar-val { width: 60px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; color: var(--text); padding-left: 8px; text-align: right; flex-shrink: 0; }
  .bar-pct { width: 32px; font-family: 'DM Sans', sans-serif; font-size: 8px; color: var(--text-muted); text-align: right; flex-shrink: 0; }

  /* ── Analysis blocks ── */
  .analysis-grid { display: flex; flex-direction: column; gap: 8px; }
  .ablock { background: var(--bg-card); border-left: 3px solid var(--gold); padding: 10px 12px; }
  .ablock-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: var(--gold); margin-bottom: 6px; }
  .ablock-body { font-family: 'DM Sans', sans-serif; font-size: 12px; color: #E0D8CC; line-height: 1.65; }

  /* ── Board summary table ── */
  .board-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; }
  .board-table th { font-family: 'Playfair Display', serif; font-size: 10px; color: var(--gold); font-weight: 600; text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--gold); letter-spacing: 0.5px; }
  .board-table th.bt-r { text-align: right; }
  .board-table td { padding: 6px 10px; border-bottom: 1px solid var(--border-light); font-size: 10px; }
  .board-table tr:nth-child(even) td { background: rgba(255,255,255,0.015); }
  .bt-label { color: var(--text-secondary); }
  .bt-val { font-weight: 600; color: var(--text); text-align: right; }
  .bt-chg { text-align: right; font-size: 9px; font-weight: 500; }

  /* ── Comparison side-by-side ── */
  .cmp-grid { display: flex; gap: 16px; }
  .cmp-col { flex: 1; background: var(--bg-card); border: 1px solid var(--border); padding: 12px; }
  .cmp-col-title { font-family: 'Playfair Display', serif; font-size: 11px; font-weight: 600; color: var(--gold); margin-bottom: 8px; text-align: center; }
  .cmp-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-light); font-family: 'DM Sans', sans-serif; font-size: 9px; }
  .cmp-lbl { color: var(--text-secondary); }
  .cmp-val { font-weight: 500; color: var(--text); }

  /* ── Zone bars ── */
  .zone-row { display: flex; align-items: center; margin-bottom: 5px; }
  .zone-name { width: 100px; color: var(--text-secondary); font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; flex-shrink: 0; }
  .zone-bar { flex: 1; height: 10px; background: var(--border-light); overflow: hidden; }
  .zone-fill { height: 100%; background: linear-gradient(90deg, #C9A94E, #E8D48B); }
  .zone-val { width: 65px; text-align: right; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; color: var(--text); flex-shrink: 0; }
  .zone-pct { width: 32px; text-align: right; font-size: 8px; color: var(--text-muted); flex-shrink: 0; }

  /* ── Payment cards ── */
  .pay-cards { display: flex; gap: 10px; }
  .pay-card { flex: 1; background: var(--bg-card); border: 1px solid var(--border); padding: 10px; text-align: center; }
  .pay-icon { font-size: 18px; margin-bottom: 4px; }
  .pay-val { font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .pay-lbl { font-family: 'DM Sans', sans-serif; font-size: 9px; color: var(--text-muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
  .pay-pct { font-family: 'DM Sans', sans-serif; font-size: 10px; color: var(--gold); font-weight: 600; margin-top: 2px; }

  /* ── Heatmap table ── */
  .hm-wrap { overflow-x: auto; background: var(--bg-card); border: 1px solid var(--border); }
  .hm-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; font-size: 10px; }
  .hm-table th, .hm-table td { padding: 8px 6px; text-align: center; border-bottom: 1px solid var(--border-light); }
  .hm-table th { color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; font-size: 8px; }
  .hm-table td { color: var(--text-secondary); }
  .hm-prod { text-align: left; color: var(--text); font-weight: 500; min-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hm-total { text-align: right; color: var(--gold-light); font-weight: 600; min-width: 60px; }

  /* ── Page footer ── */
  .page-footer { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; font-family: 'DM Sans', sans-serif; font-size: 7px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 5px; }

  /* ── Utilities ── */
  .text-green { color: var(--green); }
  .text-red { color: var(--red); }
  .text-gold { color: var(--gold); }
  .mt-8 { margin-top: 8px; }
  .mt-12 { margin-top: 12px; }
</style>
</head>
<body>

<!-- ═══ PAGE 1 — COVER ═══ -->
<div class="page page-cover">
  <div class="cover-frame">
    <div class="cover-brand-top">ATTICK <span class="cover-amp">&amp;</span> KELLER</div>
    <div class="cover-sub-brand">Restaurante &amp; Bar</div>
    <div class="cover-line"></div>
    <div class="cover-title">INFORME RAYO</div>
    <div class="cover-subtitle">Reporte Ejecutivo de Ventas</div>
    <div class="cover-period">${periodLabel}</div>
    ${dayName ? `<div class="cover-day">${dayName}</div>` : ''}
  </div>
  <div class="cover-footer">Confidencial • Generado ${todayLabel}</div>
</div>

<!-- ═══ PAGE 2 — KPIs + CHARTS ═══ -->
<div class="page">
  <div class="page-header">
    <span class="page-hdr-brand">Métricas Clave</span>
    <span class="page-hdr-period">${periodLabel}</span>
  </div>

  <div class="hero">
    <div class="hero-val">${fmt(revenue)}</div>
    <div class="hero-lbl">Ingresos Totales</div>
    ${cKpi ? `<div class="hero-chg ${revenue >= cRevenue ? 'text-green' : 'text-red'}">${pct(revenue, cRevenue)} vs período anterior</div>` : ''}
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-lbl">Transacciones</div>
      <div class="kpi-val">${fmtN(cheques)}</div>
      ${cKpi ? `<div class="kpi-chg ${cheques >= cCheques ? 'text-green' : 'text-red'}">${pct(cheques, cCheques)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Ticket Promedio</div>
      <div class="kpi-val">${fmt(ticketProm)}</div>
      ${cKpi ? `<div class="kpi-chg ${ticketProm >= cTicketProm ? 'text-green' : 'text-red'}">${pct(ticketProm, cTicketProm)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Eficiencia</div>
      <div class="kpi-val">${eff}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Clientes</div>
      <div class="kpi-val">${fmtN(personas)}</div>
      ${cKpi ? `<div class="kpi-chg ${personas >= cPersonas ? 'text-green' : 'text-red'}">${pct(personas, cPersonas)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Propinas</div>
      <div class="kpi-val">${fmt(propina)}</div>
      ${cKpi ? `<div class="kpi-chg ${propina >= cPropina ? 'text-green' : 'text-red'}">${pct(propina, cPropina)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Propina / Cliente</div>
      <div class="kpi-val">${fmt(propinaPer)}</div>
      ${cKpi ? `<div class="kpi-chg ${propinaPer >= cPropinaPer ? 'text-green' : 'text-red'}">${pct(propinaPer, cPropinaPer)}</div>` : ''}
    </div>
  </div>

  ${donutHtml ? `
  <div class="sec">
    <h2 class="sec-title">Distribución de Ingresos</h2>
    ${donutHtml}
  </div>` : ''}

  ${topProducts.length > 0 ? `
  <div class="sec">
    <h2 class="sec-title">Top Productos</h2>
    ${topProducts.slice(0, 10).map((p: ProductData, i: number) => {
      const val = Number(p.revenue ?? 0)
      const pctOfTotal = revenue > 0 ? ((val / revenue) * 100).toFixed(1) : '0'
      const color = i < 3 ? '#C9A94E' : i < 6 ? '#A0522D' : '#5D1528'
      return progressBar(p.product_name || '-', val, maxRev, color, fmt(val), pctOfTotal + '%')
    }).join('')}
  </div>` : ''}

  <div class="page-footer">
    <span>PÁGINA 2</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>

<!-- ═══ PAGE 3 — ANALYSIS + BOARD SUMMARY ═══ -->
<div class="page">
  <div class="page-header">
    <span class="page-hdr-brand">Análisis &amp; Resumen</span>
    <span class="page-hdr-period">${periodLabel}</span>
  </div>

  ${analysisSections.length > 0 ? `
  <div class="sec">
    <h2 class="sec-title">Análisis Inteligente</h2>
    <div class="analysis-grid">
      ${analysisSections.map((s: AnalysisSection) => `
      <div class="ablock">
        <div class="ablock-title">${s.icon} ${s.title}</div>
        <div class="ablock-body">${s.body.replace(/\n/g, '<br>')}</div>
      </div>`).join('')}
    </div>
  </div>` : (analysis ? `
  <div class="sec">
    <h2 class="sec-title">Análisis Inteligente</h2>
    <div class="ablock">
      <div class="ablock-body">${analysis.replace(/\n/g, '<br>')}</div>
    </div>
  </div>` : '')}

  <div class="sec mt-8">
    <h2 class="sec-title">Resumen para Junta Directiva</h2>
    <table class="board-table">
      <thead><tr><th>Métrica</th><th class="bt-r">Valor</th>${cKpi ? '<th class="bt-r">Variación</th>' : ''}</tr></thead>
      <tbody>
        <tr><td class="bt-label">Ventas Totales</td><td class="bt-val">${fmt(revenue)}</td>${cKpi ? `<td class="bt-chg ${revenue >= cRevenue ? 'text-green' : 'text-red'}">${pct(revenue, cRevenue)}</td>` : ''}</tr>
        <tr><td class="bt-label">Transacciones</td><td class="bt-val">${fmtN(cheques)}</td>${cKpi ? `<td class="bt-chg ${cheques >= cCheques ? 'text-green' : 'text-red'}">${pct(cheques, cCheques)}</td>` : ''}</tr>
        <tr><td class="bt-label">Ticket Promedio</td><td class="bt-val">${fmt(ticketProm)}</td>${cKpi ? `<td class="bt-chg ${ticketProm >= cTicketProm ? 'text-green' : 'text-red'}">${pct(ticketProm, cTicketProm)}</td>` : ''}</tr>
        <tr><td class="bt-label">Clientes</td><td class="bt-val">${fmtN(personas)}</td>${cKpi ? `<td class="bt-chg ${personas >= cPersonas ? 'text-green' : 'text-red'}">${pct(personas, cPersonas)}</td>` : ''}</tr>
        <tr><td class="bt-label">Propinas</td><td class="bt-val">${fmt(propina)}</td>${cKpi ? `<td class="bt-chg ${propina >= cPropina ? 'text-green' : 'text-red'}">${pct(propina, cPropina)}</td>` : ''}</tr>
        <tr><td class="bt-label">Propina / Cliente</td><td class="bt-val">${fmt(propinaPer)}</td>${cKpi ? `<td class="bt-chg ${propinaPer >= cPropinaPer ? 'text-green' : 'text-red'}">${pct(propinaPer, cPropinaPer)}</td>` : ''}</tr>
      </tbody>
    </table>
  </div>

  <div class="page-footer">
    <span>PÁGINA 3</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>

<!-- ═══ PAGE 4 — SALES DETAIL ═══ -->
<div class="page">
  <div class="page-header">
    <span class="page-hdr-brand">Detalle de Ventas</span>
    <span class="page-hdr-period">${periodLabel}</span>
  </div>

  ${zones.length > 0 ? `
  <div class="sec">
    <h2 class="sec-title">Ventas por Zona</h2>
    ${zones.map((z: ZoneData) => {
      const zVal = Number(z.total_ventas ?? 0)
      const zPct = revenue > 0 ? Math.round((zVal / revenue) * 100) : 0
      return `<div class="zone-row"><span class="zone-name">${z.zone || '-'}</span><div class="zone-bar"><div class="zone-fill" style="width:${Math.max(zPct, 1)}%"></div></div><span class="zone-val">${fmt(zVal)}</span><span class="zone-pct">${zPct}%</span></div>`
    }).join('')}
  </div>` : ''}

  ${categories.length > 0 ? `
  <div class="sec">
    <h2 class="sec-title">Top Categorías</h2>
    ${categories.slice(0, 8).map((c: CategorySummary) => {
      const color = '#C9A94E'
      return progressBar(c.category, c.revenue, maxCatRev, color, fmt(c.revenue), c.pct.toFixed(0) + '%')
    }).join('')}
  </div>` : ''}

  ${cKpi ? `
  <div class="sec">
    <h2 class="sec-title">Comparativa Período Anterior</h2>
    <div class="cmp-grid">
      <div class="cmp-col">
        <div class="cmp-col-title">Período Actual</div>
        <div class="cmp-row"><span class="cmp-lbl">Ventas</span><span class="cmp-val">${fmt(revenue)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Transacciones</span><span class="cmp-val">${fmtN(cheques)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Ticket Prom</span><span class="cmp-val">${fmt(ticketProm)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Clientes</span><span class="cmp-val">${fmtN(personas)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Propinas</span><span class="cmp-val">${fmt(propina)}</span></div>
      </div>
      <div class="cmp-col">
        <div class="cmp-col-title">Período Anterior</div>
        <div class="cmp-row"><span class="cmp-lbl">Ventas</span><span class="cmp-val">${fmt(cRevenue)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Transacciones</span><span class="cmp-val">${fmtN(cCheques)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Ticket Prom</span><span class="cmp-val">${fmt(cTicketProm)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Clientes</span><span class="cmp-val">${fmtN(cPersonas)}</span></div>
        <div class="cmp-row"><span class="cmp-lbl">Propinas</span><span class="cmp-val">${fmt(cPropina)}</span></div>
      </div>
    </div>
  </div>` : ''}

  ${payments.length > 0 ? `
  <div class="sec">
    <h2 class="sec-title">Métodos de Pago</h2>
    <div class="pay-cards">
      ${payments.map((p: PaymentData) => {
        const method = p.payment_method || 'Otro'
        const total = Number(p.total ?? 0)
        const pctVal = Number(p.pct ?? 0)
        return `<div class="pay-card">
          <div class="pay-val">${fmt(total)}</div>
          <div class="pay-lbl">${method}</div>
          <div class="pay-pct">${Math.round(pctVal)}%</div>
        </div>`
      }).join('')}
    </div>
  </div>` : ''}

  <div class="page-footer">
    <span>PÁGINA ${pageNum4}</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>

${hourlySection}
</body>
</html>`
}
