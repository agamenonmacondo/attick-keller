// ═══ A&K Informes Rayo — PDF HTML Generator (Dark Frank Theme) ═══
// Dark premium theme: black background, golden accents, Inter + JetBrains Mono
// Self-contained HTML designed for Playwright → PDF rendering in Vercel serverless

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

// ── SVG Donut Chart ──
function buildDonutSvg(payments: PaymentData[], total: number): string {
  const colors = ['#C9A94E', '#4ADE80', '#60A5FA']
  const labels = ['Efectivo', 'Tarjeta', 'Transf']
  let cumulative = 0
  let slices = ''
  const cx = 140, cy = 90, r = 70, inner = 42

  for (let i = 0; i < labels.length; i++) {
    const val = Number(payments[i]?.total ?? 0)
    if (val <= 0) continue
    const pct = val / (total || 1)
    const end = cumulative + pct
    const x1 = cx + r * Math.cos(cumulative * 2 * Math.PI - Math.PI / 2)
    const y1 = cy + r * Math.sin(cumulative * 2 * Math.PI - Math.PI / 2)
    const x2 = cx + r * Math.cos(end * 2 * Math.PI - Math.PI / 2)
    const y2 = cy + r * Math.sin(end * 2 * Math.PI - Math.PI / 2)
    const large = pct > 0.5 ? 1 : 0
    const ix1 = cx + inner * Math.cos(end * 2 * Math.PI - Math.PI / 2)
    const iy1 = cy + inner * Math.sin(end * 2 * Math.PI - Math.PI / 2)
    const ix2 = cx + inner * Math.cos(cumulative * 2 * Math.PI - Math.PI / 2)
    const iy2 = cy + inner * Math.sin(cumulative * 2 * Math.PI - Math.PI / 2)
    slices += `<path d="M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z" fill="${colors[i]}"/>`
    cumulative = end
  }

  const mainPct = payments.length > 0 && total > 0
    ? Math.round((Math.max(...payments.map(p => Number(p.total ?? 0))) / total) * 100)
    : 0

  let legendHtml = ''
  for (let i = 0; i < labels.length; i++) {
    const val = Number(payments[i]?.total ?? 0)
    const p = total > 0 ? Math.round((val / total) * 100) : 0
    legendHtml += `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span class="legend-label">${labels[i]}</span><span class="legend-value">${fmt(val)}</span><span class="legend-pct">${p}%</span></div>`
  }

  return `<div class="donut-wrap">
    <svg width="280" height="180" viewBox="0 0 280 180">
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="${inner}" fill="#0A0A0A"/>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#F5F5F5" font-family="Inter" font-size="28" font-weight="700">${mainPct}%</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#A0A0A0" font-family="Inter" font-size="10">principal</text>
    </svg>
    <div class="legend">${legendHtml}</div>
  </div>`
}

// ── Progress bar ──
function progressBar(label: string, value: number, max: number, color: string, showVal: string): string {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return `<div class="bar-row">
    <span class="bar-label">${label}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="bar-value">${showVal}</span>
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

  const periodLabel = formatDateEs(from) + (from !== to ? ' — ' + formatDateEs(to) : '')
  const todayLabel = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

  const maxRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: ProductData) => Number(p.revenue ?? 0))) : 1

  // Donut
  let donutHtml = ''
  if (payments.length > 0) {
    donutHtml = buildDonutSvg(payments, revenue)
  }

  // Product hourly: build matrix if data available
  let hourlySection = ''
  if (productHourly && productHourly.length > 0) {
    const { products, hours, grandTotal } = buildProductHourlyTable(productHourly)
    const maxHour = products.length > 0 ? Math.max(...hours) : 23
    let headerRow = '<th class="th-prod">Producto</th>'
    for (let h = 0; h <= maxHour; h++) {
      if (hours.includes(h)) headerRow += `<th>${h}h</th>`
    }
    headerRow += '<th class="th-num">Total</th>'

    let bodyRows = ''
    const maxVal = products.length > 0 ? Math.max(...products.map(p => p.totalRevenue)) : 1
    for (const prod of products) {
      let row = `<td class="td-prod">${prod.name.substring(0, 22)}</td>`
      for (let h = 0; h <= maxHour; h++) {
        const v = prod.hourly.get(h) ?? 0
        if (hours.includes(h)) {
          const intensity = v > 0 ? Math.round((v / maxVal) * 100) : 0
          row += `<td style="background:rgba(201,169,78,${(intensity / 100 * 0.4).toFixed(2)})">${v > 0 ? fmt(v) : ''}</td>`
        }
      }
      row += `<td class="td-num"><strong>${fmt(prod.totalRevenue)}</strong></td>`
      bodyRows += `<tr>${row}</tr>`
    }

    hourlySection = `<div class="section">
      <h2 class="section-title">Productos × Hora</h2>
      <p class="period-sub">Distribución horaria de ingresos por producto</p>
      <div class="table-wrap">
        <table class="heatmap-table">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

  :root {
    --bg: #0A0A0A;
    --bg-card: #141414;
    --gold: #C9A94E;
    --gold-light: #E8D48B;
    --text: #F5F5F5;
    --text-secondary: #A0A0A0;
    --text-tertiary: #666666;
    --border: #1A1A1A;
    --green: #4ADE80;
    --red: #F87171;
  }

  @page { size: A4 portrait; margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; -webkit-font-smoothing: antialiased; }

  .page { width: 210mm; min-height: 297mm; padding: 16mm 14mm 20mm; position: relative; overflow: hidden; page-break-after: always; background: var(--bg); }
  .page:last-child { page-break-after: auto; }

  /* ── Page Header ── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px; }
  .page-header-brand { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--gold); letter-spacing: 3px; text-transform: uppercase; }
  .page-header-period { font-size: 10px; color: var(--text-secondary); }

  /* ── COVER ── */
  .page-cover { background: linear-gradient(145deg, #0A0A0A 0%, #141210 40%, #0D0D0D 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .cover-frame { border: 1px solid rgba(201,169,78,0.2); border-radius: 2px; padding: 48px 40px; }
  .cover-brand { font-family: 'Inter', sans-serif; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: var(--text); margin-bottom: 4px; }
  .cover-brand-sub { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--gold); letter-spacing: 6px; margin-bottom: 24px; }
  .cover-divider { width: 80px; height: 1px; background: var(--gold); margin: 0 auto 28px; }
  .cover-title { font-size: 52px; font-weight: 900; color: var(--gold-light); letter-spacing: -1px; margin-bottom: 6px; }
  .cover-subtitle { font-size: 11px; color: var(--text-tertiary); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 20px; }
  .cover-period { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .cover-footer { position: absolute; bottom: 18mm; font-size: 8px; color: var(--text-tertiary); letter-spacing: 2px; }

  /* ── Hero KPI ── */
  .hero-kpi { text-align: center; padding: 24px 0 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .hero-value { font-size: 48px; font-weight: 900; color: var(--gold-light); letter-spacing: -1px; }
  .hero-label { font-size: 10px; color: var(--text-tertiary); letter-spacing: 4px; text-transform: uppercase; margin-top: 2px; }
  .hero-change { font-size: 12px; margin-top: 4px; }

  /* ── KPI Grid ── */
  .kpi-grid { display: flex; flex-wrap: wrap; margin: 0 -6px 12px; }
  .kpi-card { width: 31.33%; margin: 0 1% 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 14px 12px; }
  .kpi-label { font-size: 7px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
  .kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .kpi-change { font-size: 9px; }

  /* ── Section ── */
  .section { margin-bottom: 14px; }
  .section-title { font-size: 12px; font-weight: 600; color: var(--gold); letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px; }
  .period-sub { font-size: 8px; color: var(--text-tertiary); margin-bottom: 10px; margin-top: -6px; }

  /* ── Donut ── */
  .donut-wrap { display: flex; align-items: flex-start; gap: 30px; padding: 8px 0; }
  .legend { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 10px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .legend-label { color: var(--text-secondary); min-width: 70px; }
  .legend-value { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: var(--text); min-width: 60px; text-align: right; }
  .legend-pct { color: var(--text-tertiary); font-size: 9px; }

  /* ── Bars ── */
  .bar-row { display: flex; align-items: center; margin-bottom: 6px; font-size: 9px; }
  .bar-label { width: 90px; color: var(--text-secondary); text-align: right; padding-right: 8px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 10px; background: var(--border); border-radius: 0 3px 3px 0; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 0 3px 3px 0; min-width: 2px; }
  .bar-value { width: 70px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text); padding-left: 8px; text-align: right; }

  /* ── Analysis ── */
  .analysis-box { background: var(--bg-card); border-left: 3px solid var(--gold); border-radius: 0 6px 6px 0; padding: 12px 14px; margin-top: 4px; }
  .analysis-text { font-size: 9px; color: var(--text-secondary); line-height: 1.6; }

  /* ── Junta ── */
  .junta-table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .junta-table td { padding: 6px 10px; border-bottom: 1px solid var(--border); }
  .junta-label { color: var(--text-secondary); }
  .junta-val { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: var(--text); text-align: right; }
  .junta-change { font-size: 8px; text-align: right; }
  .junta-divider td { border-top: 1px solid rgba(201,169,78,0.3); padding-top: 8px; }
  .junta-divider-label { font-size: 8px; color: var(--gold); letter-spacing: 1px; }

  /* ── Zones ── */
  .zone-item { display: flex; align-items: center; margin-bottom: 5px; font-size: 9px; }
  .zone-name { width: 80px; color: var(--text-secondary); font-weight: 500; }
  .zone-bar-wrap { flex: 1; height: 8px; background: var(--border); border-radius: 0 2px 2px 0; overflow: hidden; }
  .zone-bar-fill { height: 100%; background: linear-gradient(90deg, rgba(201,169,78,0.7), rgba(232,212,139,0.5)); border-radius: 0 2px 2px 0; }
  .zone-val { width: 70px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text); }
  .zone-pct { width: 35px; text-align: right; font-size: 8px; color: var(--text-tertiary); }

  /* ── Heatmap table ── */
  .table-wrap { overflow-x: auto; background: var(--bg-card); border-radius: 4px; border: 1px solid var(--border); }
  .heatmap-table { width: 100%; border-collapse: collapse; font-size: 7px; }
  .heatmap-table th, .heatmap-table td { padding: 4px 6px; text-align: center; border-bottom: 1px solid var(--border); }
  .heatmap-table th { color: var(--text-tertiary); font-weight: 400; letter-spacing: 0.5px; }
  .heatmap-table td { color: var(--text-secondary); }
  .th-prod { text-align: left; min-width: 90px; }
  .td-prod { text-align: left; color: var(--text); font-weight: 500; }
  .th-num, .td-num { text-align: right; min-width: 50px; color: var(--gold-light); }

  /* ── Page footer ── */
  .page-footer { position: absolute; bottom: 10mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; font-size: 7px; color: var(--text-tertiary); border-top: 1px solid var(--border); padding-top: 6px; }

  /* ── Utility ── */
  .text-green { color: var(--green); }
  .text-red { color: var(--red); }
  .text-gold { color: var(--gold); }
</style>
</head>
<body>
<div class="page page-cover">
  <div class="cover-frame">
    <div class="cover-brand">ATTICK & KELLER</div>
    <div class="cover-brand-sub">RESTAURANTE & BAR</div>
    <div class="cover-divider"></div>
    <div class="cover-title">INFORME RAYO</div>
    <div class="cover-subtitle">Reporte Ejecutivo de Ventas</div>
    <div class="cover-period">${periodLabel}</div>
  </div>
  <div class="cover-footer">CONFIDENCIAL • GENERADO ${todayLabel.toUpperCase()}</div>
</div>

<div class="page">
  <div class="page-header">
    <span class="page-header-brand">A&K • INFORME RAYO</span>
    <span class="page-header-period">${periodLabel}</span>
  </div>
  <div class="hero-kpi">
    <div class="hero-value">${fmt(revenue)}</div>
    <div class="hero-label">Ingresos Totales</div>
    ${cKpi ? `<div class="hero-change ${revenue >= cRevenue ? 'text-green' : 'text-red'}">${pct(revenue, cRevenue)} vs período anterior</div>` : ''}
  </div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Transacciones</div>
      <div class="kpi-value">${fmtN(cheques)}</div>
      ${cKpi ? `<div class="kpi-change ${cheques >= cCheques ? 'text-green' : 'text-red'}">${pct(cheques, cCheques)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ticket Promedio</div>
      <div class="kpi-value">${fmt(ticketProm)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Eficiencia</div>
      <div class="kpi-value">${eff}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Clientes</div>
      <div class="kpi-value">${fmtN(personas)}</div>
      ${cKpi ? `<div class="kpi-change ${personas >= cPersonas ? 'text-green' : 'text-red'}">${pct(personas, cPersonas)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Propinas</div>
      <div class="kpi-value">${fmt(propina)}</div>
      ${cKpi ? `<div class="kpi-change ${propina >= cPropina ? 'text-green' : 'text-red'}">${pct(propina, cPropina)}</div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Propina/Cliente</div>
      <div class="kpi-value">${fmt(propinaPer)}</div>
    </div>
  </div>
  ${donutHtml ? `
  <div class="section">
    <h2 class="section-title">Distribución de Ingresos</h2>
    ${donutHtml}
  </div>` : ''}
  ${topProducts.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Top Productos</h2>
    ${topProducts.slice(0, 10).map((p: ProductData, i: number) => {
      const val = Number(p.revenue ?? 0)
      const color = i < 3 ? 'var(--gold)' : i < 6 ? '#8B7355' : '#444'
      return progressBar(p.product_name?.substring(0, 18) || '-', val, maxRev, color, fmt(val))
    }).join('')}
  </div>` : ''}
  <div class="page-footer">
    <span>PÁGINA 2</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>

<div class="page">
  <div class="page-header">
    <span class="page-header-brand">A&K • ANÁLISIS</span>
    <span class="page-header-period">${periodLabel}</span>
  </div>
  ${(analysis && analysis.length > 0) ? `
  <div class="section">
    <h2 class="section-title">Análisis Inteligente</h2>
    <div class="analysis-box">
      <div class="analysis-text">${analysis.replace(/\n/g, '<br>')}</div>
    </div>
  </div>` : ''}
  <div class="section">
    <h2 class="section-title">Resumen para Junta Directiva</h2>
    <table class="junta-table">
      <tr><td class="junta-label">Ventas Totales</td><td class="junta-val">${fmt(revenue)}</td>${cKpi ? `<td class="junta-change ${revenue >= cRevenue ? 'text-green' : 'text-red'}">${pct(revenue, cRevenue)}</td>` : '<td></td>'}</tr>
      <tr><td class="junta-label">Transacciones</td><td class="junta-val">${fmtN(cheques)}</td>${cKpi ? `<td class="junta-change ${cheques >= cCheques ? 'text-green' : 'text-red'}">${pct(cheques, cCheques)}</td>` : '<td></td>'}</tr>
      <tr><td class="junta-label">Ticket Promedio</td><td class="junta-val">${fmt(ticketProm)}</td><td></td></tr>
      ${personas > 0 ? `<tr><td class="junta-label">Clientes</td><td class="junta-val">${fmtN(personas)}</td>${cKpi ? `<td class="junta-change ${personas >= cPersonas ? 'text-green' : 'text-red'}">${pct(personas, cPersonas)}</td>` : '<td></td>'}</tr>` : ''}
      ${propina > 0 ? `<tr><td class="junta-label">Propinas</td><td class="junta-val">${fmt(propina)}</td>${cKpi ? `<td class="junta-change ${propina >= cPropina ? 'text-green' : 'text-red'}">${pct(propina, cPropina)}</td>` : '<td></td>'}</tr>` : ''}
      ${propinaPer > 0 ? `<tr><td class="junta-label">Propina/Cliente</td><td class="junta-val">${fmt(propinaPer)}</td><td></td></tr>` : ''}
      ${cKpi ? `<tr class="junta-divider"><td colspan="3" class="junta-divider-label">VARIACIÓN VS PERÍODO ANTERIOR</td></tr>` : ''}
    </table>
  </div>
  ${zones.length > 0 ? `
  <div class="section" style="margin-top:16px">
    <h2 class="section-title">Ventas por Zona</h2>
    ${zones.slice(0, 8).map((z: ZoneData) => {
      const zVal = Number(z.total_ventas ?? 0)
      const zPct = revenue > 0 ? Math.round((zVal / revenue) * 100) : 0
      const zPctW = revenue > 0 ? Math.round((zVal / revenue) * 100) : 0
      return `<div class="zone-item"><span class="zone-name">${(z.zone || '-').substring(0, 12)}</span><div class="zone-bar-wrap"><div class="zone-bar-fill" style="width:${zPctW}%"></div></div><span class="zone-val">${fmt(zVal)}</span><span class="zone-pct">${zPct}%</span></div>`
    }).join('')}
  </div>` : ''}
  <div class="page-footer">
    <span>PÁGINA 3</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>

${hourlySection ? `
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">A&K • DETALLE HORARIO</span>
    <span class="page-header-period">${periodLabel}</span>
  </div>
  ${hourlySection}
  <div class="page-footer">
    <span>PÁGINA 4</span>
    <span>ATTICK & KELLER • INFORME RAYO</span>
  </div>
</div>` : ''}
</body>
</html>`
}
