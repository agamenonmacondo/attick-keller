import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ═══ Design System A&K ═══
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const CREMA = '#FFF8E7'
const OSCURO = '#1A0A10'
const GRIS_CLARO = '#F5F0E8'
const GRIS_TEXTO = '#8B7E74'
const BLANCO = '#FFFFFF'

Font.register({
  family: 'Playfair',
  fonts: [{ src: 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb7jK1dbwOIsY0tT3j4Y0.woff2', fontWeight: 700 }],
})

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp9y4By4OEmHvA1IGBA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp9y4By4OEmHvA1KBg-.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp9y4By4OEmHvA1KHiA.woff2', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { backgroundColor: BLANCO, padding: 0, fontFamily: 'DM Sans' },
  // ── Header ──
  headerBar: { backgroundColor: BORGONA, paddingVertical: 18, paddingHorizontal: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: DORADO, fontSize: 20, fontFamily: 'Playfair', letterSpacing: 1.5 },
  headerSubtitle: { color: `${BLANCO}CC`, fontSize: 9, marginTop: 2 },
  headerPeriod: { color: BLANCO, fontSize: 10, opacity: 0.9 },
  // ── Sections ──
  section: { paddingHorizontal: 28, paddingVertical: 12 },
  sectionTitle: { fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: BORGONA, marginBottom: 8, letterSpacing: 0.5 },
  sectionDivider: { height: 1, backgroundColor: `${DORADO}44`, marginBottom: 8 },
  // ── KPI Grid ──
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  kpiCard: { width: '16.66%', paddingHorizontal: 6, marginBottom: 8 },
  kpiBox: { backgroundColor: GRIS_CLARO, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 8, borderLeftWidth: 3, borderLeftColor: DORADO },
  kpiLabel: { fontSize: 7.5, color: GRIS_TEXTO, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  kpiValue: { fontSize: 14, fontWeight: 700, color: OSCURO },
  kpiDelta: { fontSize: 8, marginTop: 1 },
  // ── Tables ──
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: BORGONA, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 8, color: BLANCO, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: `${GRIS_TEXTO}33` },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: GRIS_CLARO, borderBottomWidth: 0.5, borderBottomColor: `${GRIS_TEXTO}33` },
  tableCell: { fontSize: 8.5, color: OSCURO },
  tableCellBold: { fontSize: 8.5, color: OSCURO, fontWeight: 600 },
  tableCellRight: { fontSize: 8.5, color: OSCURO, textAlign: 'right' },
  // ── AI Analysis ──
  aiBox: { backgroundColor: `${BORGONA}08`, borderColor: `${DORADO}44`, borderWidth: 1, borderRadius: 8, padding: 14, paddingHorizontal: 18 },
  aiTitle: { fontSize: 11, fontWeight: 700, color: BORGONA, marginBottom: 6 },
  aiSection: { fontSize: 9, color: OSCURO, lineHeight: 1.5, marginBottom: 4 },
  aiLabel: { fontWeight: 700, color: BORGONA },
  // ── Footer ──
  footer: { backgroundColor: BORGONA, paddingVertical: 10, paddingHorizontal: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  footerLine: { height: 2, backgroundColor: DORADO, marginHorizontal: 28, marginTop: 20 },
  footerText: { color: `${BLANCO}99`, fontSize: 7 },
  footerBrand: { color: DORADO, fontSize: 9, fontFamily: 'Playfair', letterSpacing: 1 },
})

function formatCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

interface PDFProps {
  data: any
  from: string
  to: string
  analysis?: string | null
}

export function InformeRayoPDFDocument({ data, from, to, analysis }: PDFProps) {
  const kpi = data?.kpis || {}
  const kpis = Array.isArray(kpi) ? kpi[0] : kpi
  const compKpi = data?.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null
  
  const revenue = Number(kpis?.total_ventas ?? kpis?.revenue ?? 0)
  const cheques = Number(kpis?.total_cheques ?? 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const personas = Number(kpis?.personas ?? kpis?.party_size_total ?? 0)
  const propina = Number(kpis?.propina_total ?? kpis?.tip_total ?? 0)
  const propinaPerCapita = personas > 0 ? Math.round(propina / personas) : 0

  const cRevenue = compKpi ? Number(compKpi?.total_ventas ?? compKpi?.revenue ?? 0) : 0
  const cCheques = compKpi ? Number(compKpi?.total_cheques ?? 0) : 0
  const cPersonas = compKpi ? Number(compKpi?.personas ?? 0) : 0
  const cPropina = compKpi ? Number(compKpi?.propina_total ?? compKpi?.tip_total ?? 0) : 0

  const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : null

  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const fmtDate = (d: string) => { const dt = new Date(d + 'T00:00:00'); return `${dt.getDate()} ${MONTHS[dt.getMonth()]}` }
  const periodLabel = from === to ? fmtDate(from) : `${fmtDate(from)} — ${fmtDate(to)}`

  const kpiCards = [
    { label: 'Ventas', value: formatCOP(revenue), delta: cRevenue > 0 ? pct(revenue, cRevenue) : null, sub: cheques > 0 ? `${formatNum(cheques)} cheques` : '' },
    { label: 'Cheques', value: formatNum(cheques), delta: cCheques > 0 ? pct(cheques, cCheques) : null, sub: '' },
    { label: 'Ticket Prom.', value: formatCOP(ticketProm), delta: null, sub: '' },
    { label: 'Personas', value: formatNum(personas), delta: cPersonas > 0 ? pct(personas, cPersonas) : null, sub: '' },
    { label: 'Propina', value: formatCOP(propina), delta: cPropina > 0 ? pct(propina, cPropina) : null, sub: '' },
    { label: 'Propina/Persona', value: formatCOP(propinaPerCapita), delta: null, sub: '' },
  ]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.headerBar}>
          <View>
            <Text style={s.headerTitle}>INFORME RAYO</Text>
            <Text style={s.headerSubtitle}>Attick & Keller</Text>
          </View>
          <Text style={s.headerPeriod}>{periodLabel}</Text>
        </View>

        {/* ── KPI Cards ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Métricas Clave</Text>
          <View style={s.sectionDivider} />
          <View style={s.kpiGrid}>
            {kpiCards.map((card, i) => (
              <View key={i} style={s.kpiCard}>
                <View style={s.kpiBox}>
                  <Text style={s.kpiLabel}>{card.label}</Text>
                  <Text style={s.kpiValue}>{card.value}</Text>
                  {card.delta !== null && card.delta !== undefined && (
                    <Text style={[s.kpiDelta, { color: card.delta >= 0 ? '#16a34a' : '#ef4444' }]}>
                      {card.delta >= 0 ? '↑' : '↓'} {Math.abs(card.delta).toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Top Products ── */}
        {data?.topProducts?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Top Productos</Text>
            <View style={s.sectionDivider} />
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: '8%' }]}>#</Text>
                <Text style={[s.tableHeaderCell, { width: '35%' }]}>Producto</Text>
                <Text style={[s.tableHeaderCell, { width: '27%' }]}>Categoría</Text>
                <Text style={[s.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Und.</Text>
                <Text style={[s.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Ventas</Text>
              </View>
              {data.topProducts.slice(0, 12).map((p: any, i: number) => (
                <View key={p.product_id || i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCell, { width: '8%' }]}>{i + 1}</Text>
                  <Text style={[s.tableCellBold, { width: '35%' }]}>{p.product_name}</Text>
                  <Text style={[s.tableCell, { width: '27%' }]}>{p.category_name}</Text>
                  <Text style={[s.tableCellRight, { width: '15%' }]}>{formatNum(p.quantity)}</Text>
                  <Text style={[s.tableCellRight, { width: '15%' }]}>{formatCOP(p.revenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Zones ── */}
        {data?.zones?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Por Zona</Text>
            <View style={s.sectionDivider} />
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: '30%' }]}>Zona</Text>
                <Text style={[s.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Ventas</Text>
                <Text style={[s.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Cheques</Text>
                <Text style={[s.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Ticket Prom.</Text>
              </View>
              {data.zones.map((z: any, i: number) => (
                <View key={z.zone || i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCellBold, { width: '30%' }]}>{z.zone}</Text>
                  <Text style={[s.tableCellRight, { width: '25%' }]}>{formatCOP(z.total_ventas)}</Text>
                  <Text style={[s.tableCellRight, { width: '20%' }]}>{z.total_cheques}</Text>
                  <Text style={[s.tableCellRight, { width: '25%' }]}>{z.total_cheques > 0 ? formatCOP(Math.round(z.total_ventas / z.total_cheques)) : '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Payments ── */}
        {data?.payments?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Métodos de Pago</Text>
            <View style={s.sectionDivider} />
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: '35%' }]}>Método</Text>
                <Text style={[s.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Total</Text>
                <Text style={[s.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Cheques</Text>
                <Text style={[s.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>%</Text>
              </View>
              {data.payments.map((p: any, i: number) => (
                <View key={p.payment_method || i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCellBold, { width: '35%' }]}>{p.payment_method}</Text>
                  <Text style={[s.tableCellRight, { width: '25%' }]}>{formatCOP(p.total)}</Text>
                  <Text style={[s.tableCellRight, { width: '20%' }]}>{p.cheques}</Text>
                  <Text style={[s.tableCellRight, { width: '20%' }]}>{p.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── AI Analysis ── */}
        {analysis && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>⚡ Análisis IA</Text>
            <View style={s.sectionDivider} />
            <View style={s.aiBox}>
              <Text style={s.aiSection}>{analysis}</Text>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footerLine} />
        <View style={s.footer}>
          <Text style={s.footerText}>Informe generado {new Date().toLocaleDateString('es-CO')}</Text>
          <Text style={s.footerBrand}>Línea dorada · Rayo IA ⚡</Text>
        </View>
      </Page>
    </Document>
  )
}