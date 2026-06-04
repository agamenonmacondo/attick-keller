import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ═══ Design System A&K ═══
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const CREMA = '#FFF8E7'
const OSCURO = '#1A0A10'
const GRIS = '#6B5B6E'
const GRIS_CLARO = '#F5F0EB'
const BLANCO = '#FFFFFF'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')

// ═══ Styles ═══
const styles = StyleSheet.create({
  page: {
    backgroundColor: BLANCO,
    padding: 0,
    fontFamily: 'Helvetica',
  },
  // ── Cover Page ──
  cover: {
    height: '100%',
    backgroundColor: BORGONA,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverLine: {
    width: 80,
    height: 2,
    backgroundColor: DORADO,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: BLANCO,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: DORADO,
    textAlign: 'center',
    marginBottom: 30,
  },
  coverPeriod: {
    fontSize: 18,
    color: BLANCO,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 6,
  },
  coverFooter: {
    fontSize: 10,
    color: DORADO,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  // ── Content Pages ──
  contentPage: {
    padding: '40 50 40 50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: `1 solid ${DORADO}`,
    paddingBottom: 10,
  },
  headerBrand: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
  },
  headerDate: {
    fontSize: 9,
    color: GRIS,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
    marginTop: 20,
    marginBottom: 10,
    paddingLeft: 10,
    borderLeft: `3 solid ${DORADO}`,
  },
  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  kpiCard: {
    width: '31%',
    backgroundColor: CREMA,
    borderRadius: 6,
    padding: 10,
    borderLeft: `3 solid ${DORADO}`,
  },
  kpiLabel: {
    fontSize: 8,
    color: GRIS,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: OSCURO,
    marginBottom: 2,
  },
  kpiDelta: {
    fontSize: 8,
    color: GRIS,
  },
  // ── Tables ──
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BORGONA,
    padding: '6 8',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BLANCO,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottom: `0.5 solid ${GRIS_CLARO}`,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '5 8',
    backgroundColor: GRIS_CLARO,
    borderBottom: `0.5 solid ${GRIS_CLARO}`,
  },
  tableCell: {
    fontSize: 9,
    color: OSCURO,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: OSCURO,
  },
  tableCellNum: {
    fontSize: 9,
    color: OSCURO,
    textAlign: 'right',
  },
  // ── Analysis ──
  analysisBox: {
    backgroundColor: CREMA,
    borderRadius: 6,
    padding: 15,
    borderLeft: `3 solid ${BORGONA}`,
    marginBottom: 10,
  },
  analysisTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
    marginBottom: 6,
  },
  analysisText: {
    fontSize: 9,
    color: OSCURO,
    lineHeight: 1.5,
  },
  analysisBullet: {
    fontSize: 9,
    color: OSCURO,
    lineHeight: 1.5,
    marginLeft: 10,
    marginBottom: 2,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `0.5 solid ${DORADO}`,
    paddingTop: 8,
  },
  footerLeft: {
    fontSize: 7,
    color: GRIS,
  },
  footerRight: {
    fontSize: 7,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
  },
})

function getKpi(kpi: any, field: string): number {
  return Number(kpi?.[field] ?? kpi?.[field] ?? 0)
}

interface Props {
  data: any
  from: string
  to: string
  analysis: string | null
}

export function InformeRayoPDFDocument({ data, from, to, analysis }: Props) {
  const kpi = data?.kpis
  const compKpi = data?.comparison?.kpis
  const zones = data?.zones || []
  const products = data?.topProducts || data?.staff || []
  const payments = data?.payments || []

  const revenue = getKpi(kpi, 'total_ventas')
  const cheques = getKpi(kpi, 'total_cheques')
  const personas = getKpi(kpi, 'personas')
  const propina = getKpi(kpi, 'propina_total')
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const propinaPerCapita = personas > 0 ? Math.round(propina / personas) : 0
  const propinaPct = revenue > 0 ? (propina / revenue * 100).toFixed(1) : '0'

  const cRevenue = compKpi ? getKpi(compKpi, 'total_ventas') : 0
  const cCheques = compKpi ? getKpi(compKpi, 'total_cheques') : 0
  const cPersonas = compKpi ? getKpi(compKpi, 'personas') : 0

  const pct = (cur: number, prev: number) => {
    if (!prev || prev === 0) return ''
    const change = ((cur - prev) / prev) * 100
    return `${change >= 0 ? '↑' : '↓'}${Math.abs(change).toFixed(1)}%`
  }

  // Parse analysis sections
  const analysisSections = (analysis || '').split(/(?=[⚡📈📉💡📋⚠️🏆📊])\s*\*?\*?/).filter(Boolean)

  // Format date for display
  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
  }

  // Column widths for tables
  const colW = { num: '8%', name: '32%', cat: '22%', qty: '15%', rev: '23%' }
  const payW = { method: '30%', total: '25%', cheques: '20%', pct: '25%' }
  const zoneW = { zone: '30%', ventas: '25%', cheques: '20%', ticket: '25%' }

  return (
    <Document>
      {/* ═══ PAGE 1: COVER ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverLine} />
          <Text style={styles.coverTitle}>INFORME RAYO</Text>
          <Text style={styles.coverSubtitle}>Attic & Keller — Reporte Ejecutivo</Text>
          <View style={{ height: 40 }} />
          <Text style={styles.coverPeriod}>{formatDate(from)} — {formatDate(to)}</Text>
          {compKpi && (
            <Text style={{ fontSize: 11, color: DORADO, marginTop: 6 }}>
              Comparado con: {formatDate(data?.period?.compareFrom || '')} — {formatDate(data?.period?.compareTo || '')}
            </Text>
          )}
          <Text style={styles.coverFooter}>Línea dorada · Rayo IA ⚡</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: KPIs + TOP PRODUCTS ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.contentPage}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerBrand}>INFORME RAYO · Attic & Keller</Text>
            <Text style={styles.headerDate}>{formatDate(from)} — {formatDate(to)}</Text>
          </View>

          {/* KPIs */}
          <Text style={styles.sectionTitle}>Métricas Clave</Text>
          <View style={styles.kpiGrid}>
            {/* Ventas */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ventas</Text>
              <Text style={styles.kpiValue}>{fmt(revenue)}</Text>
              {cRevenue > 0 && <Text style={styles.kpiDelta}>{pct(revenue, cRevenue)}</Text>}
            </View>
            {/* Cheques */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cheques</Text>
              <Text style={styles.kpiValue}>{fmtN(cheques)}</Text>
              {cCheques > 0 && <Text style={styles.kpiDelta}>{pct(cheques, cCheques)}</Text>}
            </View>
            {/* Ticket Prom */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ticket Prom.</Text>
              <Text style={styles.kpiValue}>{fmt(ticketProm)}</Text>
            </View>
            {/* Personas */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Personas</Text>
              <Text style={styles.kpiValue}>{fmtN(personas)}</Text>
              {cPersonas > 0 && <Text style={styles.kpiDelta}>{pct(personas, cPersonas)}</Text>}
            </View>
            {/* Propina */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Propina</Text>
              <Text style={styles.kpiValue}>{fmt(propina)}</Text>
              <Text style={styles.kpiDelta}>{propinaPct}% de ventas</Text>
            </View>
            {/* Prop/Persona */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Propina/Persona</Text>
              <Text style={styles.kpiValue}>{fmt(propinaPerCapita)}</Text>
            </View>
          </View>

          {/* Top Products */}
          {products.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top Productos</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: colW.num }]}>#</Text>
                  <Text style={[styles.tableHeaderCell, { width: colW.name }]}>Producto</Text>
                  <Text style={[styles.tableHeaderCell, { width: colW.cat }]}>Categoría</Text>
                  <Text style={[styles.tableHeaderCell, { width: colW.qty, textAlign: 'right' }]}>Und.</Text>
                  <Text style={[styles.tableHeaderCell, { width: colW.rev, textAlign: 'right' }]}>Ventas</Text>
                </View>
                {products.slice(0, 15).map((p: any, i: number) => (
                  <View key={p.product_id || i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCell, { width: colW.num }]}>{i + 1}</Text>
                    <Text style={[styles.tableCellBold, { width: colW.name }]}>{p.product_name || p.name || '-'}</Text>
                    <Text style={[styles.tableCell, { width: colW.cat }]}>{p.category_name || p.group_name || '-'}</Text>
                    <Text style={[styles.tableCellNum, { width: colW.qty }]}>{fmtN(p.quantity || 0)}</Text>
                    <Text style={[styles.tableCellNum, { width: colW.rev }]}>{fmt(p.revenue || 0)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerLeft}>Attic & Keller — Informe ejecutivo</Text>
            <Text style={styles.footerRight}>Rayo IA ⚡</Text>
          </View>
        </View>
      </Page>

      {/* ═══ PAGE 3: ZONES + PAYMENTS ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.contentPage}>
          <View style={styles.header}>
            <Text style={styles.headerBrand}>INFORME RAYO · Attic & Keller</Text>
            <Text style={styles.headerDate}>{formatDate(from)} — {formatDate(to)}</Text>
          </View>

          {/* Zones */}
          {zones.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Por Zona</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: zoneW.zone }]}>Zona</Text>
                  <Text style={[styles.tableHeaderCell, { width: zoneW.ventas, textAlign: 'right' }]}>Ventas</Text>
                  <Text style={[styles.tableHeaderCell, { width: zoneW.cheques, textAlign: 'right' }]}>Cheques</Text>
                  <Text style={[styles.tableHeaderCell, { width: zoneW.ticket, textAlign: 'right' }]}>Ticket Prom.</Text>
                </View>
                {zones.map((z: any, i: number) => (
                  <View key={z.zone || i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCellBold, { width: zoneW.zone }]}>{z.zone || 'Sin zona'}</Text>
                    <Text style={[styles.tableCellNum, { width: zoneW.ventas }]}>{fmt(z.total_ventas || 0)}</Text>
                    <Text style={[styles.tableCellNum, { width: zoneW.cheques }]}>{fmtN(z.total_cheques || 0)}</Text>
                    <Text style={[styles.tableCellNum, { width: zoneW.ticket }]}>
                      {(z.total_cheques || 0) > 0 ? fmt(Math.round((z.total_ventas || 0) / z.total_cheques)) : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Métodos de Pago</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: payW.method }]}>Método</Text>
                  <Text style={[styles.tableHeaderCell, { width: payW.total, textAlign: 'right' }]}>Total</Text>
                  <Text style={[styles.tableHeaderCell, { width: payW.cheques, textAlign: 'right' }]}>Cheques</Text>
                  <Text style={[styles.tableHeaderCell, { width: payW.pct, textAlign: 'right' }]}>%</Text>
                </View>
                {payments.map((p: any, i: number) => (
                  <View key={p.payment_method || p.method || i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCellBold, { width: payW.method }]}>{p.payment_method || p.method || '-'}</Text>
                    <Text style={[styles.tableCellNum, { width: payW.total }]}>{fmt(p.total || 0)}</Text>
                    <Text style={[styles.tableCellNum, { width: payW.cheques }]}>{fmtN(p.cheques || 0)}</Text>
                    <Text style={[styles.tableCellNum, { width: payW.pct }]}>{p.pct || 0}%</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.footer} fixed>
            <Text style={styles.footerLeft}>Attic & Keller — Informe ejecutivo</Text>
            <Text style={styles.footerRight}>Rayo IA ⚡</Text>
          </View>
        </View>
      </Page>

      {/* ═══ PAGE 4: AI Analysis ═══ */}
      {analysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.contentPage}>
            <View style={styles.header}>
              <Text style={styles.headerBrand}>INFORME RAYO · Análisis IA</Text>
              <Text style={styles.headerDate}>{formatDate(from)} — {formatDate(to)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Análisis Rayo IA ⚡</Text>

            {analysisSections.map((section, i) => (
              <View key={i} style={styles.analysisBox}>
                <Text style={styles.analysisText}>{section.replace(/\*\*/g, '')}</Text>
              </View>
            ))}

            {/* Resumen para Junta */}
            <View style={[styles.analysisBox, { borderLeftColor: DORADO }]}>
              <Text style={[styles.analysisTitle, { color: DORADO }]}>
                Resumen Ejecutivo — Copiar para Acta de Junta
              </Text>
              <Text style={styles.analysisText}>
                • Ventas: {fmt(revenue)}{cRevenue > 0 ? ` (${pct(revenue, cRevenue)})` : ''}
              </Text>
              <Text style={styles.analysisText}>
                • {fmtN(cheques)} cheques, {fmtN(personas)} personas, ticket promedio {fmt(ticketProm)}
              </Text>
              <Text style={styles.analysisText}>
                • Propina: {fmt(propina)} ({propinaPct}% de ventas)
              </Text>
              <Text style={styles.analysisText}>
                • Período: {formatDate(from)} — {formatDate(to)}
              </Text>
            </View>

            <View style={styles.footer} fixed>
              <Text style={styles.footerLeft}>Attic & Keller — Informe ejecutivo</Text>
              <Text style={styles.footerRight}>Rayo IA ⚡</Text>
            </View>
          </View>
        </Page>
      )}
    </Document>
  )
}