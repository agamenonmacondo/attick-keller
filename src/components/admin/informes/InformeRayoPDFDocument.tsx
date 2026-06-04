import {
  Document, Page, Text, View, StyleSheet, Font,
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
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

// ═══ Styles — Dark Luxury v2 (more breathing room) ═══
const styles = StyleSheet.create({
  page: {
    backgroundColor: SURFACE,
    padding: 0,
    fontFamily: 'Helvetica',
  },
  // ── Cover ──
  cover: {
    backgroundColor: BORGONA,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60 40',
  },
  coverGoldRule: {
    width: 100,
    height: 0.5,
    backgroundColor: DORADO,
    marginBottom: 28,
  },
  coverTitle: {
    fontSize: 38,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 6,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 11,
    color: DORADO,
    letterSpacing: 8,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  coverPeriod: {
    fontSize: 16,
    color: ON_SURFACE,
    fontFamily: 'Helvetica-Bold',
    marginTop: 30,
    marginBottom: 4,
    letterSpacing: 1,
  },
  coverDate: {
    fontSize: 9,
    color: ON_SURFACE_VAR,
    marginTop: 12,
    letterSpacing: 2,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  coverFooterText: {
    fontSize: 7,
    color: DORADO_DIM,
    letterSpacing: 3,
  },
  // ── Content — generous padding ──
  content: {
    padding: '36 44',
  },
  // ── Section headers ──
  sectionLabel: {
    fontSize: 8,
    color: DORADO,
    letterSpacing: 3,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 22,
    color: ON_SURFACE,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  goldLine: {
    width: '100%',
    height: 0.5,
    backgroundColor: DORADO_DIM,
    marginBottom: 14,
  },
  // ── KPI Grid — bigger, breathable ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    width: '32%',
    backgroundColor: SURFACE_CONTAINER,
    borderTopWidth: 2,
    borderTopColor: DORADO,
    padding: '12 14',
    paddingBottom: 14,
  },
  kpiLabel: {
    fontSize: 7,
    color: DORADO,
    letterSpacing: 2.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 20,
    color: ON_SURFACE,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
  },
  kpiDelta: {
    fontSize: 8,
    marginLeft: 4,
  },
  kpiSub: {
    fontSize: 7,
    color: ON_SURFACE_VAR,
    marginTop: 3,
  },
  // ── Bar chart — taller, clearer ──
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 7.5,
    color: ON_SURFACE_VAR,
    width: 100,
    textAlign: 'right',
    paddingRight: 8,
    fontFamily: 'Helvetica-Bold',
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: SURFACE_HIGH,
    borderRadius: 1,
  },
  barFill: {
    height: '100%',
    borderRadius: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  barValue: {
    fontSize: 6.5,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Section spacer ──
  sectionGap: {
    marginTop: 18,
  },
  // ── Detail rows — more spacious ──
  twoColRow: {
    flexDirection: 'row',
    gap: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: DORADO_DIM,
  },
  detailLabel: {
    fontSize: 8,
    color: ON_SURFACE_VAR,
  },
  detailValue: {
    fontSize: 8,
    color: DORADO_LIGHT,
    fontFamily: 'Helvetica-Bold',
  },
  // ── AI Analysis — full-width stacked cards with clear bullet formatting ──
  aiSection: {
    width: '100%',
    backgroundColor: SURFACE_CONTAINER,
    borderLeftWidth: 2,
    borderLeftColor: DORADO,
    padding: '14 18',
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 10,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  aiBullet: {
    fontSize: 8.5,
    color: ON_SURFACE_VAR,
    lineHeight: 1.7,
    marginBottom: 2,
    paddingLeft: 10,
  },
  aiBulletDot: {
    fontSize: 8.5,
    color: ON_SURFACE_VAR,
    lineHeight: 1.7,
    marginBottom: 2,
  },
  aiParagraph: {
    fontSize: 8.5,
    color: ON_SURFACE_VAR,
    lineHeight: 1.7,
    marginBottom: 4,
  },
  aiFallback: {
    backgroundColor: SURFACE_CONTAINER,
    borderLeftWidth: 2,
    borderLeftColor: DORADO,
    padding: '14 18',
  },
  // ── Junta Box — clearer, more space ──
  juntaBox: {
    borderLeftWidth: 2,
    borderLeftColor: BORGONA,
    padding: '12 16',
    marginTop: 8,
  },
  juntaTitle: {
    fontSize: 11,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    marginBottom: 8,
  },
  juntaLine: {
    fontSize: 8.5,
    color: ON_SURFACE_VAR,
    lineHeight: 1.7,
    marginBottom: 3,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: DORADO_DIM,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.5,
    color: ON_SURFACE_VAR,
    letterSpacing: 1,
  },
  footerBrand: {
    fontSize: 6.5,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
})

// ═══ Parse analysis text into structured sections ═══
// Handles: emoji headers, ## headers, numbered bullets, dash bullets, plain text
function parseAnalysis(text: string) {
  const sections: { icon: string; title: string; items: { bullet: boolean; text: string }[] }[] = []
  const lines = text.split('\n')
  let current: { icon: string; title: string; items: { bullet: boolean; text: string }[] } | null = null

  const EMOJIS = /[⚡📈📉💡⚠️🏆📋📊]/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Clean markdown bold/italic
    const cleaned = trimmed.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')

    // Match section headers: "⚡ **Diagnóstico General**" or "⚡ Diagnóstico General"
    const emojiHeader = cleaned.match(/^([⚡📈📉💡⚠️🏆📋📊])\s+(.+)$/)
    if (emojiHeader) {
      if (current) sections.push(current)
      current = { icon: emojiHeader[1], title: emojiHeader[2].trim(), items: [] }
      continue
    }

    // Match ## headers (some LLMs use these)
    const mdHeader = cleaned.match(/^##\s+(.+)$/)
    if (mdHeader) {
      if (current) sections.push(current)
      current = { icon: '⚡', title: mdHeader[1].trim(), items: [] }
      continue
    }

    if (!current) {
      // If we see text before any header, create a generic section
      current = { icon: '⚡', title: 'Análisis', items: [] }
    }

    // Match bullet items: "- text", "• text", "1. text", "2) text"
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

interface PDFProps {
  data: any
  from: string
  to: string
  analysis?: string | null
}

export function InformeRayoPDFDocument({ data, from, to, analysis }: PDFProps) {
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
  const maxRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => Number(p.total_revenue || p.revenue || 0))) : 1

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
          {/* Header */}
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
          <Text style={styles.sectionLabel}>TOP PRODUCTOS</Text>
          <View style={{ ...styles.goldLine, marginBottom: 8 }} />

          {topProducts.map((p: any, i: number) => {
            const rev = Number(p.total_revenue || p.revenue || 0)
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

          {/* Payments + Zones */}
          <View style={styles.sectionGap}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>METODOS DE PAGO</Text>
                <View style={{ ...styles.goldLine, marginBottom: 6 }} />
                {payments.map((p: any, i: number) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{(p.payment_method || p.method || '').charAt(0).toUpperCase() + (p.payment_method || p.method || '').slice(1).toLowerCase()}</Text>
                    <Text style={styles.detailValue}>{fmt(p.total || p.amount || 0)} · {Math.round(p.pct || p.percentage || 0)}%</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>POR ZONA</Text>
                <View style={{ ...styles.goldLine, marginBottom: 6 }} />
                {zones.map((z: any, i: number) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={{ ...styles.detailLabel, fontFamily: 'Helvetica-Bold' }}>{z.zone_name || z.zone || z.derived_zone_name || 'Sin zona'}</Text>
                    <Text style={styles.detailValue}>{fmt(z.total_revenue || z.revenue || z.total_ventas || 0)}</Text>
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
          <Text style={styles.sectionTitle}>INFORME RAYO</Text>
          <View style={styles.goldLine} />

          {sections.length > 0 ? sections.map((sec, i) => (
            <View key={i} style={styles.aiSection}>
              <Text style={styles.aiTitle}>{sec.icon} {sec.title}</Text>
              {sec.items.map((item, j) => (
                item.bullet ? (
                  <Text key={j} style={styles.aiBullet}>  • {item.text}</Text>
                ) : (
                  <Text key={j} style={styles.aiParagraph}>{item.text}</Text>
                )
              ))}
            </View>
          )) : (
            <View style={styles.aiFallback}>
              <Text style={styles.aiParagraph}>Analisis no disponible para este periodo.</Text>
            </View>
          )}

          {/* Junta summary */}
          <View style={{ height: 20 }} />
          <View style={styles.goldLine} />
          <View style={styles.juntaBox}>
            <Text style={styles.juntaTitle}>RESUMEN PARA JUNTA</Text>
            <Text style={styles.juntaLine}>
              Ventas: {fmt(revenue)} {revDelta !== 0 ? `(${fmtPct(revDelta)})` : ''}
            </Text>
            <Text style={styles.juntaLine}>
              Cheques: {fmtN(cheques)} · Personas: {fmtN(personas)} · Ticket Promedio: {fmt(ticketProm)}
            </Text>
            <Text style={styles.juntaLine}>
              Propina Total: {fmt(propina)} · Propina/Persona: {fmt(propPerPerson)}
            </Text>
            {topProducts.length > 0 && (
              <Text style={styles.juntaLine}>
                Producto lider: {topProducts[0]?.product_name} ({fmt(Number(topProducts[0]?.total_revenue || topProducts[0]?.revenue || 0))})
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
          <Text style={styles.footerText}>Pag. 3</Text>
        </View>
      </Page>
    </Document>
  )
}