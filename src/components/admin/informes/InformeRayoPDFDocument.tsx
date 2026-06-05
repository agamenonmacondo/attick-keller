import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'

// ═══ A&K "Haute Sommelier" Design System ═══
const SURFACE = '#191112'
const SURFACE_CONTAINER = '#261d1e'
const SURFACE_HIGH = '#312829'
const ON_SURFACE = '#efdfe0'
const ON_SURFACE_VAR = '#d9c1c3'
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const DORADO_LIGHT = '#E5C365'
const DORADO_DIM = '#C9A94E66'
const BLANCO = '#FFFFFF'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')

// ═══ Styles — Dark Luxury ═══
const styles = StyleSheet.create({
  page: { backgroundColor: SURFACE, padding: 0, fontFamily: 'Helvetica' },
  // ── Cover ──
  cover: { backgroundColor: BORGONA, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60 40' },
  coverGoldRule: { width: 100, height: 0.5, backgroundColor: DORADO, marginBottom: 28 },
  coverTitle: { fontSize: 38, color: BLANCO, fontFamily: 'Helvetica-Bold', letterSpacing: 6, marginBottom: 8, textAlign: 'center' },
  coverSubtitle: { fontSize: 11, color: DORADO, letterSpacing: 8, marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  coverPeriod: { fontSize: 16, color: ON_SURFACE, fontFamily: 'Helvetica-Bold', marginTop: 30, marginBottom: 4, letterSpacing: 1 },
  coverDate: { fontSize: 9, color: ON_SURFACE_VAR, marginTop: 12, letterSpacing: 2 },
  coverFooter: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'center' },
  coverFooterText: { fontSize: 7, color: DORADO_DIM, letterSpacing: 3 },
  // ── Content ──
  content: { padding: '30 36' },
  sectionLabel: { fontSize: 8, color: DORADO, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  sectionTitle: { fontSize: 22, color: ON_SURFACE, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 8 },
  goldLine: { width: '100%', height: 0.5, backgroundColor: DORADO_DIM, marginBottom: 12 },
  // ── KPI Grid ──
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  kpiCard: { width: '32%', backgroundColor: SURFACE_CONTAINER, borderTopWidth: 2, borderTopColor: DORADO, padding: '10 12', paddingBottom: 12 },
  kpiLabel: { fontSize: 7, color: DORADO, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  kpiValue: { fontSize: 20, color: ON_SURFACE, fontFamily: 'Helvetica-Bold', lineHeight: 1.1 },
  kpiDelta: { fontSize: 8, marginLeft: 4 },
  kpiSub: { fontSize: 7, color: ON_SURFACE_VAR, marginTop: 3 },
  // ── Bar chart ──
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barLabel: { fontSize: 7, color: ON_SURFACE_VAR, width: 90, textAlign: 'right', paddingRight: 6, fontFamily: 'Helvetica-Bold' },
  barTrack: { flex: 1, height: 12, backgroundColor: SURFACE_HIGH, borderRadius: 1 },
  barFill: { height: '100%', borderRadius: 1, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4 },
  barValue: { fontSize: 6, color: BLANCO, fontFamily: 'Helvetica-Bold' },
  // ── Two column layouts ──
  twoColRow: { flexDirection: 'row', gap: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: DORADO_DIM },
  detailLabel: { fontSize: 8, color: ON_SURFACE_VAR },
  detailValue: { fontSize: 8, color: DORADO_LIGHT, fontFamily: 'Helvetica-Bold' },
  // ── AI Analysis ──
  aiSection: { width: '100%', backgroundColor: SURFACE_CONTAINER, borderLeftWidth: 2, borderLeftColor: DORADO, padding: '10 14', marginBottom: 8 },
  aiTitle: { fontSize: 9, color: DORADO, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 6 },
  aiBullet: { fontSize: 8, color: ON_SURFACE_VAR, lineHeight: 1.6, marginBottom: 2, paddingLeft: 8 },
  aiParagraph: { fontSize: 8, color: ON_SURFACE_VAR, lineHeight: 1.6, marginBottom: 3 },
  // ── Junta Box ──
  juntaBox: { borderLeftWidth: 2, borderLeftColor: BORGONA, padding: '10 12', marginTop: 6 },
  juntaTitle: { fontSize: 10, color: DORADO, fontFamily: 'Helvetica-Bold', letterSpacing: 3, marginBottom: 6 },
  juntaLine: { fontSize: 8, color: ON_SURFACE_VAR, lineHeight: 1.6, marginBottom: 2 },
  // ── Product Hourly Table (Page 4) ──
  prodTableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: DORADO, paddingBottom: 4, marginBottom: 2 },
  prodTableRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: DORADO_DIM, paddingVertical: 1.5 },
  prodColName: { width: '28%', fontSize: 6.5, color: ON_SURFACE, fontFamily: 'Helvetica-Bold', paddingRight: 4 },
  prodColHour: { width: '3%', fontSize: 6, color: ON_SURFACE_VAR, textAlign: 'center' },
  prodHourBar: { width: '3%', justifyContent: 'flex-end', paddingHorizontal: 0.5 },
  prodColTotal: { width: '8%', fontSize: 7, color: DORADO, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // ── Footer ──
  footer: { position: 'absolute', bottom: 14, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: DORADO_DIM, paddingTop: 4 },
  footerText: { fontSize: 6, color: ON_SURFACE_VAR, letterSpacing: 1 },
  footerBrand: { fontSize: 6, color: DORADO, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
})

// ═══ Parse analysis text into structured sections ═══
function parseAnalysis(text: string) {
  const sections: { icon: string; title: string; items: { bullet: boolean; text: string }[] }[] = []
  const lines = text.split('\n')
  let current: { icon: string; title: string; items: { bullet: boolean; text: string }[] } | null = null

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
      current = { icon: '⚡', title: 'Análisis', items: [] }
    }
    const bulletMatch = cleaned.match(/^[-•]\s+(.+)$/)
    const numMatch = cleaned.match(/^\d+[.)]\s+(.+)$/)
    if (bulletMatch) {
      current.items.push({ bullet: true, text: bulletMatch[1] })
    } else if (numMatch) {
      current.items.push({ bullet: true, text: numMatch[1] })
    } else {
      current.items.push({ bullet: false, text: cleaned })
    }
  }
  if (current) sections.push(current)
  return sections
}

// ═══ Build hourly matrix for PDF ═══
function buildPDFHourly(productHourly: any[]): {
  products: { name: string; category: string; hourly: Map<number, { qty: number; revenue: number }>; totalRevenue: number }[]
  hours: number[]
  maxPerHour: Map<number, number>
} {
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
    .slice(0, 15)

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

// ═══ Hour label helper ═══
function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

interface PDFProps {
  data: any
  from: string
  to: string
  analysis?: string | null
  productHourly?: any[]
}

export function InformeRayoPDFDocument({ data, from, to, analysis, productHourly }: PDFProps) {
  const kpis = data?.kpis || {}
  const revenue = Number(kpis.total_ventas || kpis.revenue || kpis.total_revenue || 0)
  const cheques = Number(kpis.total_cheques || 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const personas = Number(kpis.personas || 0)
  const propina = Number(kpis.propina_total || kpis.tip_total || 0)
  const propPerPerson = personas > 0 ? Math.round(propina / personas) : 0

  const revDelta = Number(kpis.revenue_delta || 0)
  const cheqDelta = Number(kpis.cheques_delta || 0)
  const tickDelta = Number(kpis.ticket_delta || 0)
  const persDelta = Number(kpis.persons_delta || 0)

  const topProducts = data?.topProducts?.slice(0, 10) || []
  const payments = data?.payments || []
  const zones = data?.zones || []
  const maxRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => Number(p.revenue || 0))) : 1

  const sections = analysis ? parseAnalysis(analysis) : []

  const fromDate = from.replace(/-/g, '/').replace(/^(\d{4})\//, '')
  const toDate = to.replace(/-/g, '/').replace(/^(\d{4})\//, '')

  const deltaColor = (d: number) => d >= 0 ? '#4ADE80' : '#F87171'

  const kpiCards = [
    { label: 'VENTAS', value: fmt(revenue), delta: revDelta, sub: `${fmtN(cheques)} cheques` },
    { label: 'CHEQUES', value: fmtN(cheques), delta: cheqDelta, sub: `${fmtN(personas)} personas` },
    { label: 'TICKET PROM.', value: fmt(ticketProm), delta: tickDelta, sub: '' },
    { label: 'PERSONAS', value: fmtN(personas), delta: persDelta, sub: '' },
    { label: 'PROPINA', value: fmt(propina), delta: 0, sub: '' },
    { label: 'PROP/PERSONA', value: fmt(propPerPerson), delta: 0, sub: '' },
  ]

  const barColor = (i: number) => {
    if (i < 3) return DORADO
    if (i < 6) return DORADO_LIGHT
    return '#8B7B6E'
  }

  const hourly = productHourly && productHourly.length > 0 ? buildPDFHourly(productHourly) : null

  return (
    <Document>
      {/* ═══ PAGE 1: Cover ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverGoldRule} />
          <Text style={styles.coverTitle}>ATTICK & KELLER</Text>
          <Text style={styles.coverSubtitle}>INFORME RAYO</Text>
          <View style={{ width: 60, height: 0.5, backgroundColor: DORADO, marginTop: 24, marginBottom: 30 }} />
          <Text style={styles.coverPeriod}>{fromDate} — {toDate}</Text>
          <Text style={styles.coverDate}>
            Generado: {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>INFORME EJECUTIVO · DATOS EN TIEMPO REAL</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: Data Dashboard ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>INFORME EJECUTIVO</Text>
          <Text style={styles.sectionTitle}>INFORME RAYO</Text>
          <Text style={{ fontSize: 11, color: ON_SURFACE_VAR, marginBottom: 6, letterSpacing: 1 }}>{fromDate} — {toDate}</Text>
          <View style={styles.goldLine} />

          {/* KPIs */}
          <View style={styles.kpiGrid}>
            {kpiCards.map((kpi, i) => (
              <View key={i} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  {kpi.delta !== 0 && (
                    <Text style={{ ...styles.kpiDelta, color: deltaColor(kpi.delta) }}>
                      {kpi.delta >= 0 ? '↑' : '↓'}{Math.abs(kpi.delta).toFixed(1)}%
                    </Text>
                  )}
                </View>
                {kpi.sub ? <Text style={styles.kpiSub}>{kpi.sub}</Text> : null}
              </View>
            ))}
          </View>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>TOP PRODUCTOS</Text>
              <View style={{ ...styles.goldLine, marginBottom: 6 }} />
              {topProducts.map((p: any, i: number) => {
                const rev = Number(p.revenue || 0)
                const widthPct = maxRev > 0 ? Math.max(15, (rev / maxRev) * 100) : 15
                return (
                  <View key={i} style={styles.barRow}>
                    <Text style={styles.barLabel}>{(p.product_name || '').substring(0, 18)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: barColor(i) }]}>
                        <Text style={styles.barValue}>{fmt(rev)}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </>
          )}

          {/* Payments + Zones */}
          <View style={{ marginTop: 14 }}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>METODOS DE PAGO</Text>
                <View style={{ ...styles.goldLine, marginBottom: 4 }} />
                {payments.map((p: any, i: number) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{(p.payment_method || '').charAt(0).toUpperCase() + (p.payment_method || '').slice(1).toLowerCase()}</Text>
                    <Text style={styles.detailValue}>{fmt(p.total || p.amount || 0)} · {Math.round(p.pct || 0)}%</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>POR ZONA</Text>
                <View style={{ ...styles.goldLine, marginBottom: 4 }} />
                {zones.map((z: any, i: number) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={{ ...styles.detailLabel, fontFamily: 'Helvetica-Bold' }}>{z.zone || z.zone_name || 'Sin zona'}</Text>
                    <Text style={styles.detailValue}>{fmt(z.total_ventas || z.revenue || 0)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
          <Text style={styles.footerText}>Pag. 2</Text>
        </View>
      </Page>

      {/* ═══ PAGE 3: AI Analysis + Junta ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>ANALISIS IA</Text>
          <Text style={styles.sectionTitle}>ANALISIS INTELIGENTE</Text>
          <View style={styles.goldLine} />

          {sections.length > 0 ? (
            sections.map((section, i) => (
              <View key={i} style={styles.aiSection}>
                <Text style={styles.aiTitle}>{section.icon} {section.title}</Text>
                {section.items.map((item, j) =>
                  item.bullet ? (
                    <Text key={j} style={styles.aiBullet}>• {item.text}</Text>
                  ) : (
                    <Text key={j} style={styles.aiParagraph}>{item.text}</Text>
                  )
                )}
              </View>
            ))
          ) : (
            <View style={styles.aiSection}>
              <Text style={styles.aiTitle}>⚡ Análisis no disponible</Text>
              <Text style={styles.aiParagraph}>Genera el análisis desde la sección "Análisis IA" en Informes Rayo antes de exportar el PDF.</Text>
            </View>
          )}

          {/* Junta Summary */}
          <View style={styles.juntaBox}>
            <Text style={styles.juntaTitle}>RESUMEN JUNTA</Text>
            <Text style={styles.juntaLine}>Ventas del período: {fmt(revenue)}</Text>
            <Text style={styles.juntaLine}>{cheques} cheques · {personas} personas · Ticket {fmt(ticketProm)}</Text>
            <Text style={styles.juntaLine}>Propina: {fmt(propina)} ({revenue > 0 ? (propina / revenue * 100).toFixed(1) : '0'}% de ventas)</Text>
            <Text style={styles.juntaLine}>Propina por persona: {fmt(propPerPerson)}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
          <Text style={styles.footerText}>Pag. 3</Text>
        </View>
      </Page>

      {/* ═══ PAGE 4: Top Productos × Hora ═══ */}
      {hourly && (
        <Page size="A4" style={styles.page} orientation="landscape">
          <View style={{ ...styles.content, padding: '24 28' }}>
            <Text style={styles.sectionLabel}>DESGLOSE TEMPORAL</Text>
            <Text style={styles.sectionTitle}>TOP PRODUCTOS × HORA</Text>
            <Text style={{ fontSize: 9, color: ON_SURFACE_VAR, marginBottom: 8, letterSpacing: 1 }}>{fromDate} — {toDate}</Text>
            <View style={styles.goldLine} />

            {/* Header row */}
            <View style={styles.prodTableHeader}>
              <Text style={styles.prodColName}>Producto</Text>
              {hourly.hours.map(h => (
                <Text key={h} style={styles.prodColHour}>{hourLabel(h)}</Text>
              ))}
              <Text style={styles.prodColTotal}>Total</Text>
            </View>

            {/* Product rows */}
            {hourly.products.map((prod, idx) => (
              <View key={idx} style={styles.prodTableRow}>
                <Text style={styles.prodColName}>
                  {prod.name.length > 20 ? prod.name.substring(0, 18) + '…' : prod.name}
                </Text>
                {hourly.hours.map(h => {
                  const val = prod.hourly.get(h)?.revenue || 0
                  const max = hourly.maxPerHour.get(h) || 1
                  const pct = max > 0 ? (val / max) * 100 : 0
                  return (
                    <View key={h} style={styles.prodHourBar}>
                      <View style={{
                        height: `${Math.max(2, pct)}%`,
                        backgroundColor: val > 0 ? DORADO : 'transparent',
                        width: '100%',
                        minHeight: val > 0 ? 2 : 0,
                      }} />
                    </View>
                  )
                })}
                <Text style={styles.prodColTotal}>{fmt(prod.totalRevenue)}</Text>
              </View>
            ))}

            {/* Note */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 6.5, color: ON_SURFACE_VAR }}>
                Cada barra representa la intensidad relativa de revenue del producto en esa hora respecto al máximo de la columna.
                Solo se muestran los top 15 productos por revenue total.
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
            <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
            <Text style={styles.footerText}>Pag. 4</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}
