import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ═══ A&K Design System (from DESIGN_DARK_THEME.md) ═══
const BORGONA = '#5D1528'
const BORGONA_DARK = '#3E1020'
const DORADO = '#C9A94E'
const DORADO_LIGHT = '#E8D48B'
const CREMA = '#FFF8E7'
const MADERA = '#3E2723'
const OSCURO = '#1A0A10'
const GRIS = '#6B5B6E'
const GRIS_CLARO = '#F5F0EB'
const BLANCO = '#FFFFFF'
const LADRILLO = '#A0522D'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

// ═══ Styles ═══
const styles = StyleSheet.create({
  page: {
    backgroundColor: BLANCO,
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
  coverLine: {
    width: 120,
    height: 1.5,
    backgroundColor: DORADO,
    marginBottom: 30,
  },
  coverTitle: {
    fontSize: 42,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 4,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 14,
    color: DORADO_LIGHT,
    letterSpacing: 6,
    marginBottom: 40,
  },
  coverPeriod: {
    fontSize: 18,
    color: CREMA,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  coverDate: {
    fontSize: 11,
    color: GRIS,
    marginTop: 24,
    letterSpacing: 1,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  coverFooterText: {
    fontSize: 8,
    color: GRIS,
    letterSpacing: 2,
  },
  // ── Content ──
  content: {
    padding: '28 36',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    backgroundColor: BORGONA,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconText: {
    fontSize: 10,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 11,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  goldLine: {
    width: '100%',
    height: 0.5,
    backgroundColor: DORADO,
    marginBottom: 12,
  },
  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  kpiCard: {
    width: '32%',
    backgroundColor: CREMA,
    borderRadius: 4,
    padding: '8 10',
    borderWidth: 0.5,
    borderColor: DORADO_LIGHT,
  },
  kpiLabel: {
    fontSize: 6,
    color: GRIS,
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 16,
    color: OSCURO,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
  },
  kpiDelta: {
    fontSize: 6,
    marginLeft: 3,
  },
  kpiSub: {
    fontSize: 6,
    color: GRIS,
    marginTop: 1,
  },
  // ── Bar chart ──
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 7,
    color: MADERA,
    width: 90,
    textAlign: 'right',
    paddingRight: 6,
    fontFamily: 'Helvetica-Bold',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F5F0EB',
    borderRadius: 3,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  barValue: {
    fontSize: 5.5,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Payment / Zone rows ──
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8DDD0',
  },
  detailLabel: {
    fontSize: 7,
    color: MADERA,
  },
  detailValue: {
    fontSize: 7,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
  },
  detailSub: {
    fontSize: 7,
    color: GRIS,
  },
  // ── AI Analysis ──
  aiSection: {
    backgroundColor: CREMA,
    borderRadius: 4,
    padding: '10 12',
    borderWidth: 0.5,
    borderColor: DORADO_LIGHT,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 9,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  aiBullet: {
    fontSize: 7,
    color: MADERA,
    lineHeight: 1.5,
    marginLeft: 8,
    marginBottom: 1,
  },
  aiLine: {
    fontSize: 7,
    color: MADERA,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  // ── Junta Box ──
  juntaBox: {
    borderWidth: 1,
    borderColor: BORGONA,
    borderRadius: 4,
    padding: '10 12',
    marginTop: 10,
  },
  juntaTitle: {
    fontSize: 10,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  juntaLine: {
    fontSize: 7.5,
    color: MADERA,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#DDD',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6,
    color: GRIS,
  },
  footerBrand: {
    fontSize: 6,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  // ── Section label ──
  sectionLabel: {
    fontSize: 7,
    color: GRIS,
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
})

// ═══ Parse analysis text into sections ═══
function parseAnalysis(text: string) {
  const sections: { icon: string; title: string; lines: string[] }[] = []
  const lines = text.split('\n')
  let current: { icon: string; title: string; lines: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const emojiMatch = trimmed.match(/^([⚡📈📉💡⚠️🏆📋📊])\s*\*?\*?(.+?)(?:\*?\*?)$/)
    if (emojiMatch) {
      if (current) sections.push(current)
      current = { icon: emojiMatch[1], title: emojiMatch[2].replace(/\*\*/g, '').trim(), lines: [] }
      continue
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/)
    const content = bulletMatch ? bulletMatch[1] : trimmed.replace(/\*\*/g, '')
    if (current) {
      current.lines.push(content)
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

  // Delta color
  const deltaColor = (d: number) => d >= 0 ? '#16A34A' : '#DC2626'

  const kpiCards = [
    { label: 'VENTAS', value: fmt(revenue), delta: revDelta, sub: `${fmtN(cheques)} cheques` },
    { label: 'CHEQUES', value: fmtN(cheques), delta: cheqDelta, sub: `${fmtN(personas)} personas` },
    { label: 'TICKET PROM.', value: fmt(ticketProm), delta: tickDelta, sub: '' },
    { label: 'PERSONAS', value: fmtN(personas), delta: persDelta, sub: '' },
    { label: 'PROPINA', value: fmt(propina), delta: 0, sub: '' },
    { label: 'PROP/PERSONA', value: fmt(propPerPerson), delta: 0, sub: '' },
  ]

  return (
    <Document>
      {/* ═══ PAGE 1: Cover ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverLine} />
          <Text style={styles.coverTitle}>ATTICK &amp; KELLER</Text>
          <Text style={styles.coverSubtitle}>INFORME RAYO</Text>
          <View style={{ width: 80, height: 1, backgroundColor: DORADO_LIGHT, marginBottom: 30 }} />
          <Text style={styles.coverPeriod}>{fromDate} — {toDate}</Text>
          <Text style={styles.coverDate}>
            Generado: {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>INFORME EJECUTIVO · DATOS EN TIEMPO REAL</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: Data ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          {/* KPIs */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>$</Text>
            </View>
            <Text style={styles.sectionTitle}>METRICAS CLAVE</Text>
          </View>
          <View style={styles.goldLine} />

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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>★</Text>
            </View>
            <Text style={styles.sectionTitle}>TOP PRODUCTOS</Text>
          </View>
          <View style={styles.goldLine} />

          {topProducts.map((p: any, i: number) => {
            const rev = Number(p.total_revenue || p.revenue || 0)
            const widthPct = maxRev > 0 ? Math.max(12, (rev / maxRev) * 100) : 12
            const barColor = i < 3 ? DORADO : i < 6 ? DORADO_LIGHT : '#8B7B6E'
            return (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barLabel}>{(p.product_name || '').substring(0, 14)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: barColor }]}>
                    <Text style={styles.barValue}>{fmt(rev)}</Text>
                  </View>
                </View>
              </View>
            )
          })}

          {/* Payments + Zones */}
          <View style={{ marginTop: 14 }}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>METODOS DE PAGO</Text>
                {payments.map((p: any, i: number) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{(p.payment_method || p.method || '').charAt(0).toUpperCase() + (p.payment_method || p.method || '').slice(1).toLowerCase()}</Text>
                    <Text style={styles.detailValue}>{fmt(p.total || p.amount || 0)} · {Math.round(p.pct || p.percentage || 0)}%</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>POR ZONA</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK &amp; KELLER</Text>
          <Text style={styles.footerText}>Pag. 2</Text>
        </View>
      </Page>

      {/* ═══ PAGE 3: Analysis ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>⚡</Text>
            </View>
            <Text style={styles.sectionTitle}>ANALISIS INTELIGENTE</Text>
          </View>
          <View style={styles.goldLine} />

          {sections.length > 0 ? sections.map((sec, i) => (
            <View key={i} style={styles.aiSection}>
              <Text style={styles.aiTitle}>{sec.icon} {sec.title}</Text>
              {sec.lines.map((line, j) => (
                <Text key={j} style={styles.aiBullet}>• {line}</Text>
              ))}
            </View>
          )) : (
            <View style={styles.aiSection}>
              <Text style={styles.aiLine}>Analisis no disponible para este periodo.</Text>
            </View>
          )}

          {/* Junta summary */}
          <View style={styles.juntaBox}>
            <Text style={styles.juntaTitle}>RESUMEN EJECUTIVO PARA JUNTA</Text>
            <Text style={styles.juntaLine}>
              • Ventas: {fmt(revenue)} {revDelta !== 0 ? `(${fmtPct(revDelta)})` : ''}
            </Text>
            <Text style={styles.juntaLine}>
              • Cheques: {fmtN(cheques)} · Personas: {fmtN(personas)} · Ticket Promedio: {fmt(ticketProm)}
            </Text>
            <Text style={styles.juntaLine}>
              • Propina Total: {fmt(propina)} · Propina/Persona: {fmt(propPerPerson)}
            </Text>
            {topProducts.length > 0 && (
              <Text style={styles.juntaLine}>
                • Producto lider: {topProducts[0]?.product_name} ({fmt(Number(topProducts[0]?.total_revenue || topProducts[0]?.revenue || 0))})
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK &amp; KELLER</Text>
          <Text style={styles.footerText}>Pag. 3</Text>
        </View>
      </Page>
    </Document>
  )
}