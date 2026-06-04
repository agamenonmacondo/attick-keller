import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ═══ Design System A&K ═══
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const DORADO_LIGHT = '#E8D48B'
const CREMA = '#FFF8E7'
const OSCURO = '#1A0A10'
const GRIS = '#6B5B6E'
const GRIS_CLARO = '#F5F0EB'
const BLANCO = '#FFFFFF'
const BG_DARK = '#0D0A0B'
const CARD_BG = '#1A1215'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')

const fmtPct = (n: number) => `${n >= 0 ? '↑' : '↓'}${Math.abs(n).toFixed(1)}%`

// ═══ Styles ═══
const styles = StyleSheet.create({
  page: {
    backgroundColor: BLANCO,
    padding: 0,
    fontFamily: 'Helvetica',
  },
  // ── Cover Page ──
  cover: {
    backgroundColor: BORGONA,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60 40',
  },
  coverAccent: {
    width: 80,
    height: 2,
    backgroundColor: DORADO,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 36,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: DORADO,
    letterSpacing: 4,
    marginBottom: 40,
  },
  coverPeriod: {
    fontSize: 16,
    color: GRIS_CLARO,
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: GRIS,
    marginTop: 20,
  },
  // ── Content Pages ──
  section: {
    padding: '30 40',
  },
  sectionTitle: {
    fontSize: 13,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  goldLine: {
    width: '100%',
    height: 1,
    backgroundColor: DORADO,
    marginBottom: 16,
  },
  // KPI Grid
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    width: '31%',
    backgroundColor: '#FAF5ED',
    borderRadius: 6,
    padding: '10 12',
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  kpiLabel: {
    fontSize: 7,
    color: GRIS,
    letterSpacing: 1,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    color: OSCURO,
    fontFamily: 'Helvetica-Bold',
  },
  kpiDelta: {
    fontSize: 7,
    color: '#B91C1C',
    marginLeft: 4,
  },
  kpiSub: {
    fontSize: 7,
    color: GRIS,
    marginTop: 1,
  },
  // Products table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORGONA,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8DDD0',
    paddingVertical: 3,
  },
  tableCell: {
    fontSize: 8,
    color: OSCURO,
  },
  tableCellRight: {
    fontSize: 8,
    color: OSCURO,
    textAlign: 'right',
  },
  tableCellHighlight: {
    fontSize: 8,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Zones / Payments row ──
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
  },
  twoColLeft: {
    flex: 1,
  },
  twoColRight: {
    flex: 1,
  },
  // ── AI Analysis ──
  aiSection: {
    backgroundColor: '#FAF5ED',
    borderRadius: 6,
    padding: '14 16',
    borderWidth: 1,
    borderColor: DORADO,
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 11,
    color: BORGONA,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  aiText: {
    fontSize: 8,
    color: OSCURO,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  aiBullet: {
    fontSize: 8,
    color: OSCURO,
    lineHeight: 1.5,
    marginLeft: 8,
    marginBottom: 2,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#DDD',
    paddingTop: 6,
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
  // Bar chart simulation
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  barLabel: {
    fontSize: 7,
    color: OSCURO,
    width: 100,
    textAlign: 'right',
    paddingRight: 6,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#F5F0EB',
    borderRadius: 3,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: DORADO,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  barValue: {
    fontSize: 6,
    color: BLANCO,
    fontFamily: 'Helvetica-Bold',
  },
  // Donut placeholder
  donutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  donutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: '4 8',
    backgroundColor: '#FAF5ED',
    borderRadius: 4,
  },
  donutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  donutLabel: {
    fontSize: 7,
    color: OSCURO,
  },
  donutPct: {
    fontSize: 7,
    color: BORGONA,
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

    // Check for emoji section headers like ⚡, 📈, 📉, 💡, ⚠️, 🏆, 📋, 📊
    const emojiMatch = trimmed.match(/^([⚡📈📉💡⚠️🏆📋📊])\s*\*?\*?(.+?)(?:\*?\*?)$/)
    if (emojiMatch) {
      if (current) sections.push(current)
      current = { icon: emojiMatch[1], title: emojiMatch[2].replace(/\*\*/g, '').trim(), lines: [] }
      continue
    }

    // Check for numbered/bullet items
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
  const revenue = Number(kpis.total_revenue ?? kpis.revenue ?? 0)
  const cheques = Number(kpis.total_cheques ?? kpis.cheques ?? 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const personas = Number(kpis.party_size_total ?? kpis.personas ?? 0)
  const propina = Number(kpis.propina_total ?? kpis.tip_total ?? 0)
  const propPerPerson = personas > 0 ? Math.round(propina / personas) : 0

  const revDelta = Number(kpis.revenue_delta ?? 0)
  const cheqDelta = Number(kpis.cheques_delta ?? 0)
  const tickDelta = Number(kpis.ticket_delta ?? 0)
  const persDelta = Number(kpis.persons_delta ?? 0)

  const topProducts = data?.topProducts?.slice(0, 10) || []
  const payments = data?.payments || []
  const zones = data?.zones || []
  const maxRev = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => Number(p.total_revenue || p.revenue || 0))) : 1

  const paymentColors = [DORADO, BORGONA, '#8B7B6E', '#3E2723', '#A89070']
  const sections = analysis ? parseAnalysis(analysis) : []

  const fromDate = from.replace(/-/g, '/').replace(/^(\d{4})\//, '')
  const toDate = to.replace(/-/g, '/').replace(/^(\d{4})\//, '')

  return (
    <Document>
      {/* ═══ PAGE 1: Cover ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverTitle}>ATTICK & KELLER</Text>
          <Text style={styles.coverSubtitle}>INFORME RAYO</Text>
          <View style={{ width: 80, height: 1, backgroundColor: DORADO, marginBottom: 30 }} />
          <Text style={styles.coverPeriod}>{fromDate} — {toDate}</Text>
          <Text style={styles.coverDate}>Generado: {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: KPIs + Top Products + Payments ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MÉTRICAS CLAVE</Text>
          <View style={styles.goldLine} />

          <View style={styles.kpiRow}>
            {[
              { label: 'VENTAS', value: fmt(revenue), delta: revDelta, sub: `${fmtN(cheques)} cheques` },
              { label: 'CHEQUES', value: fmtN(cheques), delta: cheqDelta, sub: `${fmtN(personas)} personas` },
              { label: 'TICKET PROM.', value: fmt(ticketProm), delta: tickDelta, sub: '' },
              { label: 'PERSONAS', value: fmtN(personas), delta: persDelta, sub: '' },
              { label: 'PROPINA', value: fmt(propina), delta: 0, sub: '' },
              { label: 'PROP/PERSONA', value: fmt(propPerPerson), delta: 0, sub: '' },
            ].map((kpi, i) => (
              <View key={i} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  {kpi.delta !== 0 && <Text style={styles.kpiDelta}>{fmtPct(kpi.delta)}</Text>}
                </View>
                {kpi.sub ? <Text style={styles.kpiSub}>{kpi.sub}</Text> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Top Products Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP PRODUCTOS</Text>
          <View style={styles.goldLine} />
          {topProducts.map((p: any, i: number) => {
            const rev = Number(p.total_revenue || p.revenue || 0)
            const widthPct = maxRev > 0 ? Math.max(8, (rev / maxRev) * 100) : 8
            return (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barLabel}>{(p.product_name || '').substring(0, 16)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: i < 3 ? DORADO : i < 6 ? DORADO_LIGHT : '#8B7B6E' }]}>
                    <Text style={styles.barValue}>{fmt(rev)}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* Payments + Zones side by side */}
        <View style={styles.section}>
          <View style={styles.twoColRow}>
            <View style={styles.twoColLeft}>
              <Text style={styles.sectionTitle}>MÉTODOS DE PAGO</Text>
              <View style={{ ...styles.goldLine, marginBottom: 8 }} />
              {payments.map((p: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: '#E8DDD0' }}>
                  <Text style={{ fontSize: 7, color: OSCURO }}>{(p.payment_method || p.method || '').toLowerCase()}</Text>
                  <Text style={{ fontSize: 7, color: BORGONA, fontFamily: 'Helvetica-Bold' }}>{fmt(p.total || p.amount)} · {p.pct || p.percentage || 0}%</Text>
                </View>
              ))}
            </View>
            <View style={styles.twoColRight}>
              <Text style={styles.sectionTitle}>POR ZONA</Text>
              <View style={{ ...styles.goldLine, marginBottom: 8 }} />
              {zones.map((z: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: '#E8DDD0' }}>
                  <Text style={{ fontSize: 7, color: OSCURO, fontFamily: 'Helvetica-Bold' }}>{z.zone_name || z.zone || z.derived_zone_name}</Text>
                  <Text style={{ fontSize: 7, color: OSCURO }}>{fmt(z.total_revenue || z.revenue || z.total_ventas)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
          <Text style={styles.footerText}>Pág. 2</Text>
        </View>
      </Page>

      {/* ═══ PAGE 3: AI Analysis ═══ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANÁLISIS INTELIGENTE</Text>
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
              <Text style={styles.aiText}>Análisis no disponible para este período.</Text>
            </View>
          )}

          {/* Junta summary */}
          <View style={{ marginTop: 12, padding: '10 14', borderWidth: 1, borderColor: BORGONA, borderRadius: 6 }}>
            <Text style={{ fontSize: 10, color: BORGONA, fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>
              RESUMEN EJECUTIVO PARA JUNTA
            </Text>
            <Text style={{ fontSize: 8, color: OSCURO, lineHeight: 1.6 }}>
              • Ventas: {fmt(revenue)} ({revDelta !== 0 ? fmtPct(revDelta) : 'sin comparación'})
            </Text>
            <Text style={{ fontSize: 8, color: OSCURO, lineHeight: 1.6 }}>
              • Cheques: {fmtN(cheques)} · Personas: {fmtN(personas)} · Ticket Promedio: {fmt(ticketProm)}
            </Text>
            <Text style={{ fontSize: 8, color: OSCURO, lineHeight: 1.6 }}>
              • Propina Total: {fmt(propina)} · Propina/Persona: {fmt(propPerPerson)}
            </Text>
            {topProducts.length > 0 && (
              <Text style={{ fontSize: 8, color: OSCURO, lineHeight: 1.6 }}>
                • Producto líder: {topProducts[0]?.product_name} ({fmt(Number(topProducts[0]?.total_revenue || topProducts[0]?.revenue || 0))})
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Informe Rayo · {fromDate} — {toDate}</Text>
          <Text style={styles.footerBrand}>ATTICK & KELLER</Text>
          <Text style={styles.footerText}>Pág. 3</Text>
        </View>
      </Page>
    </Document>
  )
}