// ═══════════════════════════════════════════════════════════
// A&K HTML+Playwright PDF Generator — Informes Rayo
// ═══════════════════════════════════════════════════════════
import { Browser, Page } from 'playwright'

// ═══ Types ═══
export interface ProductHourlyRow {
  product_name: string
  product_id?: string
  category_name?: string
  date: string
  hour: number
  quantity: number
  revenue: number
}

export interface PDFData {
  data: any
  from: string
  to: string
  analysis?: string | null
  productHourly?: ProductHourlyRow[]
}

interface HourlyMatrix {
  products: {
    name: string
    category: string
    hourly: Map<number, { qty: number; revenue: number }>
    totalRevenue: number
  }[]
  hours: number[]
  maxPerHour: Map<number, number>
}

// ═══ Helpers ═══
const fmtM = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number): string => Math.round(n).toLocaleString('es-CO')

const hourLabel = (h: number): string => {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

const formatDate = (d: Date): string => {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

const rankBadgeClass = (rank: number): string => {
  if (rank <= 3) return 'top'
  if (rank <= 7) return 'high'
  return 'mid'
}

// ═══ Build hourly matrix from flat rows ═══
function buildHourlyMatrix(productHourly: ProductHourlyRow[], limit = 15): HourlyMatrix {
  const prodMap = new Map<string, { name: string; category: string; hourly: Map<number, { qty: number; revenue: number }> }>()
  const hourSet = new Set<number>()

  for (const row of productHourly) {
    const h = Number(row.hour)
    hourSet.add(h)
    const key = row.product_name
    if (!prodMap.has(key)) {
      prodMap.set(key, { name: row.product_name, category: row.category_name || '', hourly: new Map() })
    }
    const prod = prodMap.get(key)!
    const existing = prod.hourly.get(h)
    if (existing) {
      existing.qty += Number(row.quantity) || 0
      existing.revenue += Number(row.revenue) || 0
    } else {
      prod.hourly.set(h, { qty: Number(row.quantity) || 0, revenue: Number(row.revenue) || 0 })
    }
  }

  const products = [...prodMap.values()]
    .map(p => {
      let totalRevenue = 0
      for (const [, v] of p.hourly) totalRevenue += v.revenue
      return { ...p, totalRevenue }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)

  const hours = [...hourSet].sort((a, b) => a - b)
  const maxPerHour = new Map<number, number>()
  for (const h of hours) {
    let max = 0
    for (const p of products) {
      const v = p.hourly.get(h)?.revenue || 0
      if (v > max) max = v
    }
    maxPerHour.set(h, max)
  }

  return { products, hours, maxPerHour }
}

// ═══ CSS (A&K Design System — Rústico Editorial Moderno) ═══
const PDF_CSS = `
  /* --- CSS Custom Properties --- */
  :root {
    --cal:        #F5EDE0;
    --madera:     #3E2723;
    --borgona:    #6B2737;
    --dorado:     #C9A94E;
    --oliva:      #5C7A4D;
    --ambar:      #D4922A;
    --negro:      #1E1E1E;
    --terracota:  #A0522D;
    --cal-dark:   #EDE3D2;
    --cal-light:  #FAF5EF;
    --cream-row:  #F0E6D8;
  }

  @page { size: A4 portrait; margin: 18mm 16mm 20mm 16mm; background-color: var(--cal); }
  @media print {
    body { background-color: var(--cal); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: var(--cal); color: var(--madera);
    line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    max-width: 178mm; margin: 0 auto; padding: 0; min-height: 261mm;
  }

  .page { display: flex; flex-direction: column; min-height: 261mm; position: relative; padding: 5mm 0; }

  /* Watermark */
  .watermark {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-22deg);
    font-family: 'Playfair Display', serif; font-size: 110px; font-weight: 900;
    color: var(--cal-dark); opacity: 0.28; pointer-events: none; z-index: 0;
    letter-spacing: 0.08em; white-space: nowrap; user-select: none;
  }

  /* Header */
  .header { position: relative; z-index: 1; margin-bottom: 3.5mm; padding-bottom: 3mm; }
  .header-top-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm; }
  .header-left { flex: 0 0 auto; }
  .header-right { flex: 0 0 auto; text-align: right; }
  .header-ornament { display: block; font-family: 'Caveat', cursive; font-size: 26px; color: var(--borgona); line-height: 1; margin-bottom: 1mm; font-weight: 600; letter-spacing: 0.03em; }
  .header-label { font-family: 'DM Sans', sans-serif; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.22em; color: var(--terracota); font-weight: 500; margin-bottom: 1mm; }
  .header-title { font-family: 'Playfair Display', serif; font-size: 28pt; font-weight: 800; color: var(--madera); line-height: 1.05; letter-spacing: -0.01em; margin-bottom: 0; }
  .header-title .ampersand { font-family: 'Caveat', cursive; font-size: 34pt; color: var(--dorado); font-weight: 700; display: inline-block; margin: 0 1mm; vertical-align: -2mm; }
  .header-subtitle { font-family: 'DM Sans', sans-serif; font-size: 8pt; color: var(--terracota); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 500; margin-top: 1mm; }
  .header-meta { text-align: right; }
  .header-date { font-family: 'Playfair Display', serif; font-size: 11pt; font-weight: 600; color: var(--madera); font-style: italic; line-height: 1.3; }
  .header-date-small { font-family: 'DM Sans', sans-serif; font-size: 6.5pt; color: var(--terracota); text-transform: uppercase; letter-spacing: 0.18em; font-weight: 500; }
  .header-stats { display: flex; gap: 5mm; justify-content: flex-end; margin-top: 2mm; }
  .header-stat { text-align: right; }
  .header-stat-value { font-family: 'Playfair Display', serif; font-size: 16pt; font-weight: 700; color: var(--borgona); line-height: 1.1; }
  .header-stat-label { font-family: 'DM Sans', sans-serif; font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.18em; color: var(--terracota); font-weight: 500; }

  /* Divider */
  .divider-ornament { display: flex; align-items: center; gap: 3mm; margin-top: 3mm; }
  .divider-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent 0%, var(--dorado) 15%, var(--dorado) 85%, transparent 100%); }
  .divider-flourish { font-family: 'Caveat', cursive; font-size: 14pt; color: var(--dorado); font-weight: 700; flex: 0 0 auto; line-height: 1; }

  /* Table */
  .table-container { flex: 1; position: relative; z-index: 1; overflow: visible; }
  table.data-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; font-size: 6.8pt; }

  table.data-table thead th {
    background: transparent; padding: 2.5mm 1mm 2mm 1mm;
    font-family: 'DM Sans', sans-serif; font-size: 6.2pt; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.14em; color: var(--terracota);
    border-bottom: 1.5px solid var(--dorado); text-align: right; vertical-align: bottom; line-height: 1.3;
  }
  table.data-table thead th.col-product-header {
    text-align: left; padding-left: 2.5mm;
    font-family: 'Playfair Display', serif; font-size: 7pt; font-weight: 700;
    letter-spacing: 0.08em; color: var(--madera); text-transform: none; font-style: italic;
  }
  table.data-table thead th.col-total-header {
    font-family: 'Playfair Display', serif; font-size: 7pt; font-weight: 700;
    letter-spacing: 0.08em; color: var(--borgona); text-transform: none; font-style: italic;
  }
  table.data-table thead tr { border-bottom: 2px solid var(--dorado); }

  table.data-table tbody td {
    padding: 1.7mm 1mm; text-align: right; font-size: 6.5pt; font-weight: 400;
    color: var(--madera); border-bottom: 1px dotted rgba(201, 169, 78, 0.25);
    vertical-align: middle; letter-spacing: 0.01em;
  }
  table.data-table tbody td.col-product-name {
    text-align: left; padding-left: 2.5mm;
    font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 6.8pt;
    letter-spacing: 0.02em; color: var(--negro);
  }
  table.data-table tbody tr:nth-child(even) td { background-color: rgba(240, 230, 216, 0.6); }

  table.data-table tbody td.cell-max { font-weight: 700; color: var(--dorado); position: relative; }
  table.data-table tbody td.cell-max::after {
    content: ''; position: absolute; bottom: 0.2mm; left: 50%;
    transform: translateX(-50%); width: 70%; height: 0.7px;
    background: var(--dorado); opacity: 0.6;
  }
  table.data-table tbody td.cell-empty { color: var(--cal-dark); font-weight: 300; opacity: 0.5; }

  .rank-badge {
    display: inline-block; width: 4.5mm; height: 4.5mm; line-height: 4.5mm;
    text-align: center; border-radius: 50%;
    font-family: 'Playfair Display', serif; font-size: 5.5pt; font-weight: 700;
    margin-right: 1.8mm; flex-shrink: 0;
  }
  .rank-badge.top { background: var(--borgona); color: var(--cal); }
  .rank-badge.high { background: var(--dorado); color: var(--madera); }
  .rank-badge.mid { background: var(--cal-dark); color: var(--madera); }

  .product-cell-content { display: flex; align-items: center; }
  .product-cell-content span.name { line-height: 1.2; }

  table.data-table tbody td.col-total-cell {
    font-weight: 600; font-family: 'DM Sans', sans-serif; font-size: 6.8pt;
    color: var(--borgona); border-left: 1px solid rgba(201, 169, 78, 0.35); padding-right: 2.5mm;
  }

  table.data-table tfoot td {
    font-weight: 700; font-size: 7pt; color: var(--madera);
    border-top: 2px solid var(--dorado); border-bottom: none;
    padding-top: 2.5mm; padding-bottom: 1mm; background: transparent !important;
  }
  table.data-table tfoot td.col-product-name {
    font-family: 'Playfair Display', serif; font-style: italic; font-size: 7.5pt;
    letter-spacing: 0.05em; color: var(--madera);
  }
  table.data-table tfoot td.col-total-cell {
    color: var(--borgona); font-size: 7.5pt; font-family: 'Playfair Display', serif;
  }

  /* Footer */
  .footer { position: relative; z-index: 1; margin-top: 4mm; padding-top: 2.5mm; display: flex; justify-content: space-between; align-items: center; }
  .footer-divider { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(to right, transparent 0%, var(--dorado) 10%, var(--dorado) 90%, transparent 100%); }
  .footer-left { font-family: 'DM Sans', sans-serif; font-size: 5.5pt; color: var(--terracota); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; }
  .footer-center { font-family: 'Caveat', cursive; font-size: 12pt; color: var(--dorado); font-weight: 600; letter-spacing: 0.03em; }
  .footer-right { font-family: 'DM Sans', sans-serif; font-size: 5.5pt; color: var(--terracota); letter-spacing: 0.12em; font-weight: 500; }
`

// ═══ Build full HTML string ═══
function buildHTML(matrix: HourlyMatrix, from: string, to: string): string {
  const { products, hours } = matrix
  const totalProducts = products.length
  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0)
  const totalRows = hours.length * products.length

  // Hour totals for tfoot
  const hourTotals = new Map<number, number>()
  for (const h of hours) {
    let sum = 0
    for (const p of products) {
      sum += p.hourly.get(h)?.revenue || 0
    }
    hourTotals.set(h, sum)
  }

  // Date formatting
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T00:00:00')
  const dateStr = from === to
    ? formatDate(fromDate)
    : `${fromDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} — ${formatDate(toDate)}`
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const dayName = dayNames[new Date().getDay()]
  const todayStr = formatDate(new Date())

  // Build table header cells
  const headerCells = hours.map(h => `<th>${hourLabel(h)}</th>`).join('\n')

  // Build table rows
  const tableRows = products.map((prod, idx) => {
    const rank = idx + 1
    const name = prod.name.length > 24 ? prod.name.substring(0, 22) + '…' : prod.name
    const max = matrix.maxPerHour

    const hourCells = hours.map(h => {
      const val = prod.hourly.get(h)?.revenue || 0
      const isMax = max.get(h) !== undefined && val > 0 && max.get(h)! > 0 && val === max.get(h)
      if (val === 0) return '<td class="cell-empty">—</td>'
      if (isMax) return `<td class="cell-max">${fmtM(val)}</td>`
      return `<td>${fmtM(val)}</td>`
    }).join('\n')

    return `
        <tr>
          <td class="col-product-name">
            <div class="product-cell-content">
              <span class="rank-badge ${rankBadgeClass(rank)}">${rank}</span>
              <span class="name">${escapeHTML(name)}</span>
            </div>
          </td>
          ${hourCells}
          <td class="col-total-cell">${fmtM(prod.totalRevenue)}</td>
        </tr>`
  }).join('\n')

  // Build footer row
  const footerCells = hours.map(h => {
    const val = hourTotals.get(h) || 0
    return `<td>${fmtM(val)}</td>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>TOP PRODUCTOS × HORA — Attick & Keller</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..700&display=swap" rel="stylesheet">
<style>${PDF_CSS}</style>
</head>
<body>
<div class="page">

  <div class="watermark">ATTICK &amp; KELLER</div>

  <header class="header">
    <div class="header-top-row">
      <div class="header-left">
        <span class="header-ornament">~ análisis de productos ~</span>
        <div class="header-label">Informe Ejecutivo &nbsp;·&nbsp; Restaurante</div>
        <h1 class="header-title">
          TOP PRODUCTOS<br>
          <span class="ampersand">×</span> HORA
        </h1>
        <div class="header-subtitle">Desglose de ventas por franja horaria</div>
      </div>
      <div class="header-right">
        <div class="header-meta">
          <div class="header-date">${escapeHTML(dateStr)}</div>
          <div class="header-date-small">${dayName} &nbsp;·&nbsp; ${hours.length} horas activas &nbsp;·&nbsp; ${totalProducts} productos</div>
        </div>
        <div class="header-stats">
          <div class="header-stat">
            <div class="header-stat-value">${fmtM(totalRevenue)}</div>
            <div class="header-stat-label">Ingreso Total</div>
          </div>
          <div class="header-stat">
            <div class="header-stat-value">${fmtN(totalRows)}</div>
            <div class="header-stat-label">Filas de Datos</div>
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

  <div class="table-container">
    <table class="data-table">
      <colgroup>
        <col style="width:26%">
        ${hours.map(() => '<col style="width:7.75%">').join('\n        ')}
        <col style="width:10%">
      </colgroup>
      <thead>
        <tr>
          <th class="col-product-header">Producto</th>
          ${headerCells}
          <th class="col-total-header">Total</th>
        </tr>
      </thead>
      <tbody>
${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td class="col-product-name">Total ${totalProducts} productos</td>
          ${footerCells}
          <td class="col-total-cell">${fmtM(totalRevenue)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <footer class="footer">
    <div class="footer-divider"></div>
    <div class="footer-left">Attick &amp; Keller &nbsp;·&nbsp; Informe Confidencial</div>
    <div class="footer-center">
      ⚡ INFORME RAYO
    </div>
    <div class="footer-right">Página 1/1 &nbsp;·&nbsp; ${todayStr}</div>
  </footer>

</div>
</body>
</html>`
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ═══ Detect available Chromium executable ═══
async function findChromiumExecutable(): Promise<string> {
  // Try @sparticuz/chromium-min (Vercel-optimized)
  try {
    const sparticuz = await import('@sparticuz/chromium-min')
    const path = await sparticuz.default.executablePath()
    if (path) return path
  } catch {
    // @sparticuz not installed — continue
  }

  // Fallback: use playwright's bundled chromium
  try {
    // Let playwright find its own chromium
    return 'playwright-bundled'
  } catch {
    throw new Error('No Chromium executable found. Install @sparticuz/chromium-min or playwright with chromium.')
  }
}

// ═══ PDF Generation ═══
export async function generateProductHourlyPDF(data: PDFData): Promise<Buffer> {
  const { productHourly = [], from, to } = data

  if (!productHourly || productHourly.length === 0) {
    throw new Error('No product hourly data available for PDF generation')
  }

  // Build the data matrix
  const matrix = buildHourlyMatrix(productHourly)

  // Build HTML
  const html = buildHTML(matrix, from, to)

  // Launch browser
  const execPath = await findChromiumExecutable()

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    const { chromium } = await import('playwright')

    const launchOptions: Record<string, any> = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    }

    // If not playwright-bundled, provide explicit path
    if (execPath !== 'playwright-bundled') {
      launchOptions.executablePath = execPath
    }

    browser = await chromium.launch(launchOptions)
    page = await browser.newPage()

    // Set content and wait for fonts to load
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Additional wait for fonts
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        bottom: '20mm',
        left: '16mm',
        right: '16mm',
      },
      preferCSSPageSize: true,
    })

    return Buffer.from(pdfBuffer)
  } catch (err: any) {
    console.error('[pdf-generator] Playwright PDF generation failed:', err)
    throw new Error(`PDF generation failed: ${err.message || 'Unknown error'}`)
  } finally {
    if (page) await page.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}
