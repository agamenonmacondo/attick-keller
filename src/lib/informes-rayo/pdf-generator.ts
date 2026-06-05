// ═══ A&K Informes Rayo — PDF HTML Generator ═══
// Generates self-contained HTML with editorial A&K branding
// Designed for Playwright → PDF rendering in Vercel serverless

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

// ── Rank badge class ──
function rankBadgeClass(rank: number): string {
  if (rank <= 3) return 'top'
  if (rank <= 7) return 'high'
  return 'mid'
}

// ── Escaper ──
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ═══════════════════════════════════════════════
// MAIN HTML GENERATOR
// ═══════════════════════════════════════════════
export function generatePDFHtml(input: PDFGeneratorInput): string {
  const { data, from, to, analysis, productHourly } = input
  const kpis = data.kpis ?? {}
  const zones = data.zones ?? []
  const payments = data.payments ?? []
  const topProducts = data.topProducts ?? []
  const compKpis = data.comparison?.kpis ?? null

  const revenue = Number(kpis.total_ventas ?? 0)
  const cheques = Number(kpis.total_cheques ?? 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const personas = Number(kpis.personas ?? 0)
  const propina = Number(kpis.propina_total ?? 0)
  const propPerPerson = personas > 0 ? Math.round(propina / personas) : 0

  const cRevenue = compKpis ? Number(compKpis.total_ventas ?? 0) : 0
  const cCheques = compKpis ? Number(compKpis.total_cheques ?? 0) : 0
  const cPersonas = compKpis ? Number(compKpis.personas ?? 0) : 0

  const fromFormatted = formatDateEs(from)
  const toFormatted = formatDateEs(to)
  const fromShort = formatShortDate(from)
  const toShort = formatShortDate(to)
  const dayName = formatDayName(to)

  // Product hourly matrix
  const hourly = productHourly && productHourly.length > 0
    ? buildProductHourlyMatrix(productHourly)
    : null

  const totalProducts = productHourly?.length ?? 0
  const activeHours = hourly?.hours.length ?? 0

  // Determine if single day or range
  const isSingleDay = from === to
  const periodDisplay = isSingleDay ? fromFormatted : `${fromFormatted} — ${toFormatted}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap');

  /* ═══ A&K Design System ═══ */
  :root {
    --cal:        #F5EDE0;
    --madera:     #3E2723;
    --borgona:    #6B2737;
    --dorado:     #C9A94E;
    --terracota:  #A0522D;
    --cal-dark:   #EDE3D2;
    --negro:      #1E1E1E;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cal);
    color: var(--madera);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ═══ PAGE ═══ */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 14mm 20mm 14mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: var(--cal);
  }

  .page:last-child { page-break-after: auto; }

  /* ═══ COVER PAGE ═══ */
  .page-cover {
    background: linear-gradient(160deg, #5D1528 0%, #6B2737 40%, #4A1020 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .cover-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-22deg);
    font-family: 'Playfair Display', serif;
    font-size: 80px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.04);
    pointer-events: none;
    white-space: nowrap;
    letter-spacing: 0.08em;
  }

  .cover-rule { width: 100px; height: 1px; background: var(--dorado); margin-bottom: 32px; }
  .cover-brand { font-family: 'Playfair Display', serif; font-size: 36pt; font-weight: 800; color: #FFFFFF; letter-spacing: 0.06em; margin-bottom: 4px; }
  .cover-label { font-size: 10pt; color: var(--dorado); letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
  .cover-ampersand { font-family: 'Caveat', cursive; font-size: 48pt; color: var(--dorado); font-weight: 700; display: inline-block; margin: 0 3mm; vertical-align: -3mm; }
  .cover-rule2 { width: 60px; height: 0.5px; background: var(--dorado); margin: 28px 0 32px; }
  .cover-period { font-family: 'Playfair Display', serif; font-size: 15pt; font-weight: 600; color: var(--cal); font-style: italic; margin-bottom: 6px; }
  .cover-date { font-size: 8pt; color: rgba(255,255,255,0.55); letter-spacing: 0.12em; text-transform: uppercase; }
  .cover-footer { position: absolute; bottom: 24mm; left: 0; right: 0; text-align: center; font-size: 6.5pt; color: rgba(201,169,78,0.4); letter-spacing: 0.18em; text-transform: uppercase; }

  /* ═══ WATERMARK (content pages) ═══ */
  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-22deg);
    font-family: 'Playfair Display', serif;
    font-size: 100px;
    font-weight: 900;
    color: var(--cal-dark);
    opacity: 0.20;
    pointer-events: none;
    z-index: 0;
    letter-spacing: 0.08em;
    white-space: nowrap;
    user-select: none;
  }

  /* ═══ CONTENT WRAPPER ═══ */
  .content { position: relative; z-index: 1; }

  /* ═══ HEADER ═══ */
  .header { margin-bottom: 3.5mm; padding-bottom: 3mm; }
  .header-top-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 3mm; }
  .header-left { flex: 0 0 auto; }
  .header-right { flex: 0 0 auto; text-align: right; }

  .header-ornament {
    font-family: 'Caveat', cursive;
    font-size: 22px;
    color: var(--borgona);
    line-height: 1;
    margin-bottom: 1mm;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .header-label {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.20em;
    color: var(--terracota);
    font-weight: 500;
    margin-bottom: 1mm;
  }

  .header-title {
    font-family: 'Playfair Display', serif;
    font-size: 25pt;
    font-weight: 800;
    color: var(--madera);
    line-height: 1.05;
    letter-spacing: -0.01em;
  }

  .header-title .ampersand {
    font-family: 'Caveat', cursive;
    font-size: 30pt;
    color: var(--dorado);
    font-weight: 700;
    display: inline-block;
    margin: 0 1mm;
    vertical-align: -2mm;
  }

  .header-subtitle {
    font-size: 7.5pt;
    color: var(--terracota);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 500;
    margin-top: 1mm;
  }

  .header-date {
    font-family: 'Playfair Display', serif;
    font-size: 10pt;
    font-weight: 600;
    color: var(--madera);
    font-style: italic;
    line-height: 1.3;
  }

  .header-date-small {
    font-size: 6pt;
    color: var(--terracota);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 500;
  }

  .header-stats { display: flex; gap: 4mm; justify-content: flex-end; margin-top: 1.5mm; }
  .header-stat { text-align: right; }
  .header-stat-value { font-family: 'Playfair Display', serif; font-size: 14pt; font-weight: 700; color: var(--borgona); line-height: 1.1; }
  .header-stat-label { font-size: 5pt; text-transform: uppercase; letter-spacing: 0.15em; color: var(--terracota); font-weight: 500; }

  /* ═══ DIVIDER ═══ */
  .divider-ornament { display: flex; align-items: center; gap: 3mm; margin: 3mm 0; }
  .divider-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent 0%, var(--dorado) 15%, var(--dorado) 85%, transparent 100%); }
  .divider-flourish { font-family: 'Caveat', cursive; font-size: 12pt; color: var(--dorado); font-weight: 700; flex: 0 0 auto; line-height: 1; }

  /* ═══ KPI CARDS ═══ */
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 3mm; margin-bottom: 5mm; }
  .kpi-card {
    flex: 0 0 calc(33.33% - 2mm);
    background: #FFFFFF;
    border-top: 2px solid var(--dorado);
    padding: 3mm 3.5mm;
    border-radius: 1px;
  }
  .kpi-card-label { font-size: 6pt; color: var(--dorado); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; margin-bottom: 1.5mm; }
  .kpi-card-value { font-family: 'Playfair Display', serif; font-size: 16pt; font-weight: 700; color: var(--madera); line-height: 1.1; }
  .kpi-card-delta { font-size: 7pt; margin-left: 2mm; font-weight: 600; }
  .kpi-card-sub { font-size: 6pt; color: var(--terracota); margin-top: 1mm; }

  /* ═══ TWO-COLUMN SECTIONS ═══ */
  .section-title-sm {
    font-family: 'Playfair Display', serif;
    font-size: 10pt;
    font-weight: 700;
    color: var(--madera);
    font-style: italic;
    margin-bottom: 1.5mm;
    letter-spacing: 0.04em;
  }

  .two-col { display: flex; gap: 5mm; margin-bottom: 4mm; }
  .two-col > * { flex: 1; }

  /* ═══ DETAIL ROW ═══ */
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 1.2mm 0; border-bottom: 1px dotted rgba(201,169,78,0.25); }
  .detail-label { font-size: 7pt; color: var(--madera); font-weight: 500; }
  .detail-value { font-size: 7pt; color: var(--borgona); font-weight: 600; }

  /* ═══ TOP PRODUCTS BAR CHART ═══ */
  .bar-row { display: flex; align-items: center; margin-bottom: 1.5mm; }
  .bar-label { font-size: 6pt; color: var(--madera); width: 52mm; text-align: right; padding-right: 2mm; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { flex: 1; height: 9px; background: #EDE3D2; border-radius: 1px; overflow: hidden; }
  .bar-fill { height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 2mm; }
  .bar-fill-label { font-size: 5.5pt; color: #FFF; font-weight: 700; }

  /* ═══ ANALYSIS CARDS ═══ */
  .analysis-card {
    background: #FFFFFF;
    border-left: 3px solid var(--dorado);
    padding: 3mm 4mm;
    margin-bottom: 2.5mm;
  }
  .analysis-card-title { font-size: 8pt; color: var(--borgona); font-weight: 700; margin-bottom: 1.5mm; letter-spacing: 0.03em; }
  .analysis-card-item { font-size: 7pt; color: var(--madera); line-height: 1.5; margin-bottom: 0.8mm; padding-left: 3mm; }

  /* ═══ JUNTA BOX ═══ */
  .junta-box {
    margin-top: 3mm;
    border-left: 3px solid var(--borgona);
    padding: 3mm 4mm;
    background: #FFFFFF;
  }
  .junta-box-title { font-size: 9pt; color: var(--borgona); font-weight: 700; font-family: 'Playfair Display', serif; font-style: italic; margin-bottom: 2mm; letter-spacing: 0.04em; }
  .junta-box-line { font-size: 7pt; color: var(--madera); line-height: 1.7; }

  /* ═══ PRODUCT × HOUR TABLE ═══ */
  .table-container { position: relative; z-index: 1; }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 6.2pt;
  }

  table.data-table thead th {
    padding: 2mm 0.8mm 1.5mm 0.8mm;
    font-size: 5.8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--terracota);
    border-bottom: 1.5px solid var(--dorado);
    text-align: right;
    vertical-align: bottom;
  }

  table.data-table thead th.col-product-header {
    text-align: left;
    padding-left: 2mm;
    font-family: 'Playfair Display', serif;
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--madera);
    text-transform: none;
    font-style: italic;
  }

  table.data-table thead th.col-total-header {
    font-family: 'Playfair Display', serif;
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--borgona);
    text-transform: none;
    font-style: italic;
  }

  table.data-table tbody td {
    padding: 1.3mm 0.8mm;
    text-align: right;
    font-size: 6pt;
    font-weight: 400;
    color: var(--madera);
    border-bottom: 1px dotted rgba(201,169,78,0.22);
    vertical-align: middle;
  }

  table.data-table tbody td.col-product-name {
    text-align: left;
    padding-left: 2mm;
    font-weight: 500;
    font-size: 6.3pt;
    letter-spacing: 0.01em;
    color: var(--negro);
  }

  table.data-table tbody tr:nth-child(even) td { background-color: rgba(240,230,216,0.5); }

  table.data-table tbody td.cell-max {
    font-weight: 700;
    color: var(--dorado);
    position: relative;
  }

  table.data-table tbody td.cell-empty {
    color: var(--cal-dark);
    opacity: 0.35;
  }

  .rank-badge {
    display: inline-block;
    width: 4mm;
    height: 4mm;
    line-height: 4mm;
    text-align: center;
    border-radius: 50%;
    font-family: 'Playfair Display', serif;
    font-size: 5pt;
    font-weight: 700;
    margin-right: 1.5mm;
    flex-shrink: 0;
  }
  .rank-badge.top { background: var(--borgona); color: var(--cal); }
  .rank-badge.high { background: var(--dorado); color: var(--madera); }
  .rank-badge.mid { background: var(--cal-dark); color: var(--madera); }

  .product-cell-content { display: flex; align-items: center; }

  table.data-table tbody td.col-total-cell {
    font-weight: 600;
    font-size: 6.3pt;
    color: var(--borgona);
    border-left: 1px solid rgba(201,169,78,0.3);
    padding-right: 2mm;
  }

  table.data-table tfoot td {
    font-weight: 700;
    font-size: 6.5pt;
    color: var(--madera);
    border-top: 2px solid var(--dorado);
    padding-top: 2mm;
    padding-bottom: 1mm;
    background: transparent !important;
  }
  table.data-table tfoot td.col-product-name {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 7pt;
    letter-spacing: 0.04em;
    color: var(--madera);
  }
  table.data-table tfoot td.col-total-cell {
    color: var(--borgona);
    font-size: 7pt;
    font-family: 'Playfair Display', serif;
  }

  /* ═══ FOOTER ═══ */
  .footer {
    position: absolute;
    bottom: 12mm;
    left: 14mm;
    right: 14mm;
    padding-top: 2mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 1;
  }

  .footer-divider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, var(--dorado) 10%, var(--dorado) 90%, transparent 100%);
  }

  .footer-left { font-size: 5pt; color: var(--terracota); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
  .footer-center { font-family: 'Caveat', cursive; font-size: 10pt; color: var(--dorado); font-weight: 600; letter-spacing: 0.03em; }
  .footer-right { font-size: 5pt; color: var(--terracota); letter-spacing: 0.1em; font-weight: 500; }
</style>
</head>
<body>

<!-- ═══════════ PAGE 1: COVER ═══════════ -->
<div class="page page-cover">
  <div class="cover-watermark">ATTICK &amp; KELLER</div>
  <div class="cover-rule"></div>
  <div class="cover-label">Informe Ejecutivo</div>
  <div class="cover-brand">ATTICK<span class="cover-ampersand">&amp;</span>KELLER</div>
  <div class="cover-rule2"></div>
  <div class="cover-period">${esc(periodDisplay)}</div>
  <div class="cover-date">INFORME RAYO &nbsp;·&nbsp; DATOS EN TIEMPO REAL</div>
  <div class="cover-footer">⚡ GENERADO EL ${esc(formatDateEs(new Date().toISOString().split('T')[0]))}</div>
</div>

<!-- ═══════════ PAGE 2: KPI DASHBOARD ═══════════ -->
<div class="page">
  <div class="watermark">ATTICK &amp; KELLER</div>
  <div class="content">
    <!-- Header -->
    <header class="header">
      <div class="header-top-row">
        <div class="header-left">
          <span class="header-ornament">~ informe ejecutivo ~</span>
          <div class="header-label">Dashboard Administrativo</div>
          <h1 class="header-title">INFORME<span class="ampersand">&amp;</span>RAYO</h1>
          <div class="header-subtitle">${esc(periodDisplay)}</div>
        </div>
        <div class="header-right">
          <div class="header-date">${esc(dayName)}, ${esc(toFormatted)}</div>
          <div class="header-date-small">${esc(isSingleDay ? '1 día' : fromShort + ' — ' + toShort)}</div>
          <div class="header-stats">
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmt(revenue))}</div>
              <div class="header-stat-label">Ingreso Total</div>
            </div>
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmtN(cheques))}</div>
              <div class="header-stat-label">Cheques</div>
            </div>
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmtN(personas))}</div>
              <div class="header-stat-label">Personas</div>
            </div>
          </div>
        </div>
      </div>
      <div class="divider-ornament">
        <div class="divider-line"></div>
        <div class="divider-flourish">✦</div>
        <div class="divider-line"></div>
      </div>
    </header>

    <!-- KPI Cards -->
    <div class="kpi-grid">${(() => {
      const cards = [
        { label: 'Ventas Totales', value: fmt(revenue), delta: cRevenue ? pct(revenue, cRevenue) : '', sub: '' },
        { label: 'Cheques', value: fmtN(cheques), delta: cCheques ? pct(cheques, cCheques) : '', sub: `${fmtN(personas)} personas` },
        { label: 'Ticket Promedio', value: fmt(ticketProm), delta: '', sub: cheques > 0 ? `${fmtN(cheques)} transacciones` : '' },
        { label: 'Personas', value: fmtN(personas), delta: cPersonas ? pct(personas, cPersonas) : '', sub: '' },
        { label: 'Propina Total', value: fmt(propina), delta: '', sub: revenue > 0 ? `${(propina / revenue * 100).toFixed(1)}% de ventas` : '' },
        { label: 'Propina/Persona', value: fmt(propPerPerson), delta: '', sub: personas > 0 ? `${fmtN(personas)} personas` : '' },
      ]
      return cards.map(c => {
        const deltaIsPositive = c.delta.startsWith('↑')
        const deltaColor = deltaIsPositive ? '#5C7A4D' : '#B85450'
        return `<div class="kpi-card">
          <div class="kpi-card-label">${esc(c.label)}</div>
          <div>
            <span class="kpi-card-value">${esc(c.value)}</span>
            ${c.delta ? `<span class="kpi-card-delta" style="color:${deltaColor}">${esc(c.delta)}</span>` : ''}
          </div>
          ${c.sub ? `<div class="kpi-card-sub">${esc(c.sub)}</div>` : ''}
        </div>`
      }).join('')
    })()}</div>

    <!-- Two-column: Products + Payments -->
    <div class="two-col">${(() => {
      // Top Products
      const maxProdRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: ProductData) => Number(p.revenue ?? 0))) : 1
      const barColors = ['#C9A94E', '#C9A94E', '#C9A94E', '#D4B665', '#D4B665', '#D4B665', '#8B7B6E', '#8B7B6E', '#8B7B6E', '#8B7B6E']
      const productsHTML = topProducts.length > 0 ? `
        <div class="section-title-sm">Top Productos</div>
        ${topProducts.slice(0, 10).map((p, i) => {
          const rev = Number(p.revenue ?? 0)
          const w = maxProdRev > 0 ? Math.max(12, (rev / maxProdRev) * 100) : 12
          return `<div class="bar-row">
            <div class="bar-label">${esc((p.product_name ?? '').substring(0, 28))}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${w.toFixed(0)}%;background:${barColors[i] ?? '#8B7B6E'}">
                <span class="bar-fill-label">${esc(fmt(rev))}</span>
              </div>
            </div>
          </div>`
        }).join('')}
      ` : '<div style="font-size:7pt;color:var(--terracota);font-style:italic">Sin datos de productos</div>'

      // Payments
      const paymentsHTML = payments.length > 0 ? `
        <div class="section-title-sm" style="margin-top:3mm">Métodos de Pago</div>
        ${payments.map((p: PaymentData) => {
          const method = (p.payment_method ?? 'Otro').charAt(0).toUpperCase() + (p.payment_method ?? 'Otro').slice(1).toLowerCase()
          return `<div class="detail-row">
            <span class="detail-label">${esc(method)}</span>
            <span class="detail-value">${esc(fmt(Number(p.total ?? 0)))} · ${Math.round(Number(p.pct ?? 0))}%</span>
          </div>`
        }).join('')}
      ` : '<div style="font-size:7pt;color:var(--terracota);font-style:italic">Sin datos de pagos</div>'

      // Zones
      const zonesHTML = zones.length > 0 ? `
        <div class="section-title-sm" style="margin-top:3mm">Ventas por Zona</div>
        ${zones.map((z: ZoneData) => {
          return `<div class="detail-row">
            <span class="detail-label" style="font-weight:600">${esc(z.zone ?? 'Sin zona')}</span>
            <span class="detail-value">${esc(fmt(Number(z.total_ventas ?? 0)))}</span>
          </div>`
        }).join('')}
      ` : '<div style="font-size:7pt;color:var(--terracota);font-style:italic">Sin datos de zonas</div>'

      // Arrange into columns: Products left, Payments+Zones right
      return `<div>${productsHTML}</div>
        <div>${paymentsHTML}${zonesHTML}</div>`
    })()}</div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-divider"></div>
    <div class="footer-left">Attick &amp; Keller &nbsp;·&nbsp; Informe Confidencial</div>
    <div class="footer-center">⚡ INFORME RAYO</div>
    <div class="footer-right">Página 2</div>
  </footer>
</div>

<!-- ═══════════ PAGE 3: ANALYSIS + BOARD SUMMARY ═══════════ -->
<div class="page">
  <div class="watermark">ATTICK &amp; KELLER</div>
  <div class="content">
    <header class="header" style="margin-bottom:4mm">
      <div class="header-top-row">
        <div class="header-left">
          <span class="header-ornament">~ análisis &amp; resumen ~</span>
          <div class="header-label">Inteligencia de Negocio</div>
          <h1 class="header-title">ANÁLISIS<span class="ampersand">&amp;</span>JUNTA</h1>
          <div class="header-subtitle">${esc(periodDisplay)}</div>
        </div>
      </div>
      <div class="divider-ornament">
        <div class="divider-line"></div>
        <div class="divider-flourish">✦</div>
        <div class="divider-line"></div>
      </div>
    </header>

    <!-- AI Analysis -->
    ${analysis ? (() => {
      const sections: { icon: string; title: string; items: string[] }[] = []
      const lines = analysis.split('\n')
      let current: { icon: string; title: string; items: string[] } | null = null

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const cleaned = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
        const emojiHeader = cleaned.match(/^([⚡📈📉💡⚠️🏆📋📊])\s+(.+)$/)
        if (emojiHeader) {
          if (current) sections.push(current)
          current = { icon: emojiHeader[1], title: emojiHeader[2].trim(), items: [] }
          continue
        }
        const mdHeader = cleaned.match(/^##\s+(.+)$/)
        if (mdHeader) {
          if (current) sections.push(current)
          current = { icon: '⚡', title: mdHeader[1].trim(), items: [] }
          continue
        }
        if (!current) {
          current = { icon: '⚡', title: 'Análisis General', items: [] }
        }
        const bulletMatch = cleaned.match(/^[-•]\s+(.+)$/)
        const numMatch = cleaned.match(/^\d+[.)]\s+(.+)$/)
        if (bulletMatch) {
          current.items.push(bulletMatch[1])
        } else if (numMatch) {
          current.items.push(numMatch[1])
        } else {
          current.items.push(cleaned)
        }
      }
      if (current) sections.push(current)

      if (sections.length === 0) {
        return `<div class="analysis-card">
          <div class="analysis-card-title">⚡ Análisis del Período</div>
          <div class="analysis-card-item">${esc(analysis)}</div>
        </div>`
      }

      return sections.map(s => `
        <div class="analysis-card">
          <div class="analysis-card-title">${esc(s.icon)} ${esc(s.title)}</div>
          ${s.items.map(item => `<div class="analysis-card-item">${esc(item)}</div>`).join('')}
        </div>
      `).join('')
    })() : `
      <div class="analysis-card">
        <div class="analysis-card-title">⚡ Análisis no disponible</div>
        <div class="analysis-card-item">Genera el análisis desde la sección "Análisis IA" en el panel de Informes Rayo antes de exportar el PDF.</div>
      </div>
    `}

    <!-- Board Summary -->
    <div class="junta-box">
      <div class="junta-box-title">Resumen para Junta Directiva</div>
      <div class="junta-box-line"><strong>Ventas del período:</strong> ${esc(fmt(revenue))}</div>
      <div class="junta-box-line"><strong>Transacciones:</strong> ${esc(fmtN(cheques))} cheques · ${esc(fmtN(personas))} personas · Ticket promedio ${esc(fmt(ticketProm))}</div>
      <div class="junta-box-line"><strong>Propina:</strong> ${esc(fmt(propina))} (${revenue > 0 ? (propina / revenue * 100).toFixed(1) : '0'}% de ventas${personas > 0 ? ` · ${esc(fmt(propPerPerson))} por persona` : ''})</div>
      ${zones.length > 0 ? `<div class="junta-box-line" style="margin-top:1.5mm"><strong>Zona líder:</strong> ${esc(zones[0]?.zone ?? 'N/A')} con ${esc(fmt(Number(zones[0]?.total_ventas ?? 0)))}</div>` : ''}
    </div>
  </div>

  <footer class="footer">
    <div class="footer-divider"></div>
    <div class="footer-left">Attick &amp; Keller &nbsp;·&nbsp; Informe Confidencial</div>
    <div class="footer-center">⚡ INFORME RAYO</div>
    <div class="footer-right">Página 3${hourly ? '/4' : ''}</div>
  </footer>
</div>

${hourly ? `
<!-- ═══════════ PAGE 4: PRODUCT × HOUR TABLE ═══════════ -->
<div class="page">
  <div class="watermark">ATTICK &amp; KELLER</div>
  <div class="content">
    <header class="header">
      <div class="header-top-row">
        <div class="header-left">
          <span class="header-ornament">~ análisis de productos ~</span>
          <div class="header-label">Informe Ejecutivo &nbsp;·&nbsp; Restaurante</div>
          <h1 class="header-title">TOP PRODUCTOS<br><span class="ampersand">×</span> HORA</h1>
          <div class="header-subtitle">Desglose de ventas por franja horaria</div>
        </div>
        <div class="header-right">
          <div class="header-date">${esc(toFormatted)}</div>
          <div class="header-date-small">${esc(dayName)} &nbsp;·&nbsp; ${activeHours} horas activas &nbsp;·&nbsp; ${totalProducts} registros</div>
          <div class="header-stats">
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmt(hourly.grandTotal))}</div>
              <div class="header-stat-label">Ingreso Total</div>
            </div>
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmtN(activeHours))}</div>
              <div class="header-stat-label">Franjas</div>
            </div>
            <div class="header-stat">
              <div class="header-stat-value">${esc(fmtN(hourly.products.length))}</div>
              <div class="header-stat-label">Productos Top</div>
            </div>
          </div>
        </div>
      </div>
      <div class="divider-ornament">
        <div class="divider-line"></div>
        <div class="divider-flourish">✦</div>
        <div class="divider-line"></div>
      </div>
    </header>

    <!-- TABLE -->
    <div class="table-container">
      <table class="data-table">
        <colgroup>
          <col style="width:26%">
          ${hourly.hours.map(() => `<col style="width:${(62 / hourly.hours.length).toFixed(1)}%">`).join('')}
          <col style="width:12%">
        </colgroup>
        <thead>
          <tr>
            <th class="col-product-header">Producto</th>
            ${hourly.hours.map(h => `<th>${esc(hourLabel(h))}</th>`).join('')}
            <th class="col-total-header">Total</th>
          </tr>
        </thead>
        <tbody>
          ${hourly.products.map((prod, idx) => {
            const maxPerHour = new Map<number, number>()
            for (const h of hourly.hours) {
              let max = 0
              for (const p of hourly.products) {
                const v = p.hourly.get(h) ?? 0
                if (v > max) max = v
              }
              maxPerHour.set(h, max)
            }

            const rankClass = rankBadgeClass(idx + 1)
            return `<tr>
              <td class="col-product-name">
                <div class="product-cell-content">
                  <span class="rank-badge ${rankClass}">${idx + 1}</span>
                  <span>${esc(prod.name.length > 28 ? prod.name.substring(0, 26) + '…' : prod.name)}</span>
                </div>
              </td>
              ${hourly.hours.map(h => {
                const val = prod.hourly.get(h) ?? 0
                const max = maxPerHour.get(h) ?? 1
                if (val === 0) return `<td class="cell-empty">—</td>`
                if (max > 0 && val === max) return `<td class="cell-max">${esc(fmt(val))}</td>`
                return `<td>${esc(fmt(val))}</td>`
              }).join('')}
              <td class="col-total-cell">${esc(fmt(prod.totalRevenue))}</td>
            </tr>`
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td class="col-product-name">Total ${hourly.products.length} productos</td>
            ${hourly.hours.map(h => {
              let colTotal = 0
              for (const p of hourly.products) colTotal += (p.hourly.get(h) ?? 0)
              return `<td>${esc(fmt(colTotal))}</td>`
            }).join('')}
            <td class="col-total-cell">${esc(fmt(hourly.grandTotal))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-divider"></div>
    <div class="footer-left">Attick &amp; Keller &nbsp;·&nbsp; Informe Confidencial</div>
    <div class="footer-center">⚡ INFORME RAYO</div>
    <div class="footer-right">Página 4/4 &nbsp;·&nbsp; ${esc(toShort)}</div>
  </footer>
</div>
` : ''}

</body>
</html>`
}
