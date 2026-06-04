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
const OLIVA = '#6B7B3A'
const OSCURO = '#1A1A1A'
const GRIS_MEDIO = '#666666'
const GRIS_CLARO = '#CCCCCC'

// Register fonts (using built-in for PDF)
// Playfair, DM Sans, Caveat will fall back to Helvetica/Courier in PDF

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: OSCURO,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottom: `2px solid ${BORGONA}`,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
  },
  headerSubtitle: {
    fontSize: 10,
    color: GRIS_MEDIO,
    marginTop: 4,
  },
  headerLogo: {
    fontSize: 28,
    color: DORADO,
  },

  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    width: '31%',
    padding: 10,
    backgroundColor: CREMA,
    borderRadius: 6,
    borderLeft: `3px solid ${BORGONA}`,
  },
  kpiLabel: {
    fontSize: 8,
    color: GRIS_MEDIO,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica',
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: OSCURO,
  },
  kpiDelta: {
    fontSize: 8,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  kpiDeltaUp: { color: OLIVA },
  kpiDeltaDown: { color: BORGONA },

  // ── Section ──
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ── Table ──
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: `1px solid ${BORGONA}`,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BORGONA,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5px solid ${GRIS_CLARO}`,
    paddingVertical: 3,
  },
  tableCell: {
    fontSize: 9,
    color: OSCURO,
  },
  tableCellRight: {
    fontSize: 9,
    color: OSCURO,
    textAlign: 'right',
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: OSCURO,
  },

  // ── Analysis Section ──
  analysisSection: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
  },
  analysisSectionTrend: {
    backgroundColor: '#FFF3E0',
    borderLeft: `3px solid ${DORADO}`,
  },
  analysisSectionOk: {
    backgroundColor: '#E8F5E9',
    borderLeft: `3px solid ${OLIVA}`,
  },
  analysisSectionBad: {
    backgroundColor: '#FCE4EC',
    borderLeft: `3px solid ${BORGONA}`,
  },
  analysisSectionIdea: {
    backgroundColor: '#FFFDE7',
    borderLeft: `3px solid #F9A825`,
  },
  analysisSectionJunta: {
    backgroundColor: '#E3F2FD',
    borderLeft: `3px solid #1976D2`,
  },
  analysisTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  analysisItem: {
    fontSize: 8,
    color: GRIS_MEDIO,
    marginBottom: 2,
    lineHeight: 1.3,
  },

  // ── Junta Summary ──
  juntaSummary: {
    padding: 10,
    backgroundColor: CREMA,
    borderRadius: 6,
    borderLeft: `3px solid ${BORGONA}`,
  },
  juntaItem: {
    fontSize: 9,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `0.5px solid ${GRIS_CLARO}`,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRIS_MEDIO,
  },
  footerBrand: {
    fontSize: 7,
    color: DORADO,
    fontFamily: 'Helvetica-Bold',
  },
})

// ═══ Helpers ═══
function fmtCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function pctDelta(current: number, previous: number): { text: string; style: any } | null {
  if (!previous) return null
  const change = ((current - previous) / previous) * 100
  const arrow = change >= 0 ? '↑' : '↓'
  return {
    text: `${arrow}${Math.abs(change).toFixed(1)}%`,
    style: change >= 0 ? styles.kpiDeltaUp : styles.kpiDeltaDown,
  }
}

interface InformesRayoPDFProps {
  data: any
  from: string
  to: string
  analysis?: string | null
}

// ═══ Parse Analysis Sections ═══
function parseAnalysis(text: string) {
  const sections: { icon: string; title: string; items: string[] }[] = []
  const lines = text.split('\n')
  let current: { icon: string; title: string; items: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const headerMatch = trimmed.match(/^([⚡📈📉💡📋])\s*\*\*(.+?)\*\*/)
    if (headerMatch) {
      if (current) sections.push(current)
      current = { icon: headerMatch[1], title: headerMatch[2], items: [] }
      continue
    }

    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/)
    if (bulletMatch && current) {
      current.items.push(bulletMatch[1])
      continue
    }

    if (current && !bulletMatch) {
      const cleaned = trimmed.replace(/\*\*/g, '')
      if (cleaned) current.items.push(cleaned)
    }
  }

  if (current) sections.push(current)
  return sections
}

const SECTION_STYLE_MAP: Record<string, any> = {
  '⚡': styles.analysisSectionTrend,
  '📈': styles.analysisSectionOk,
  '📉': styles.analysisSectionBad,
  '💡': styles.analysisSectionIdea,
  '📋': styles.analysisSectionJunta,
}

// ═══ Document ═══
export function InformesRayoPDF({ data, from, to, analysis }: InformesRayoPDFProps) {
  const kpi = Array.isArray(data.kpis) ? data.kpis[0] : data.kpis
  const compKpi = data.comparison?.kpis ? (Array.isArray(data.comparison.kpis) ? data.comparison.kpis[0] : data.comparison.kpis) : null

  const revenue = Number(kpi?.total_ventas ?? kpi?.revenue ?? 0)
  const cheques = Number(kpi?.total_cheques ?? kpi?.cheques ?? 0)
  const ticketProm = cheques > 0 ? revenue / cheques : 0
  const personas = Number(kpi?.personas ?? kpi?.total_personas ?? 0)
  const propina = Number(kpi?.total_propina ?? kpi?.tips ?? 0)
  const tipPerPerson = personas > 0 ? propina / personas : 0

  const cRevenue = compKpi ? Number(compKpi.total_ventas ?? compKpi.revenue ?? 0) : 0
  const cCheques = compKpi ? Number(compKpi.total_cheques ?? compKpi.cheques ?? 0) : 0
  const cTicketProm = cCheques > 0 ? cRevenue / cCheques : 0
  const cPersonas = compKpi ? Number(compKpi.personas ?? compKpi.total_personas ?? 0) : 0
  const cPropina = compKpi ? Number(compKpi.total_propina ?? compKpi.tips ?? 0) : 0

  const zones = data.zones || []
  const staff = (data.staff || []).slice(0, 10)
  const payments = data.payments || []

  const analysisSections = analysis ? parseAnalysis(analysis) : []

  // KPI Cards data
  const kpiCards = [
    { label: 'Ventas', value: fmtCOP(revenue), delta: cRevenue ? pctDelta(revenue, cRevenue) : null },
    { label: 'Cheques', value: cheques.toLocaleString('es-CO'), delta: cCheques ? pctDelta(cheques, cCheques) : null },
    { label: 'Ticket Prom.', value: fmtCOP(ticketProm), delta: cTicketProm ? pctDelta(ticketProm, cTicketProm) : null },
    { label: 'Personas', value: personas.toLocaleString('es-CO'), delta: cPersonas ? pctDelta(personas, cPersonas) : null },
    { label: 'Propina', value: fmtCOP(propina), delta: cPropina ? pctDelta(propina, cPropina) : null },
    { label: 'Prop./Persona', value: fmtCOP(tipPerPerson), delta: null },
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>⚡ Informe Rayo</Text>
            <Text style={styles.headerSubtitle}>Período: {from} al {to}{compKpi ? ' (vs período anterior)' : ''}</Text>
          </View>
          <Text style={styles.headerLogo}>⚡</Text>
        </View>

        {/* ── KPI Cards ── */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((card, i) => (
            <View key={i} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{card.label}</Text>
              <Text style={styles.kpiValue}>{card.value}</Text>
              {card.delta && (
                <Text style={card.delta.style}>{card.delta.text}</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── Zonas ── */}
        {zones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por Zona</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Zona</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Ventas</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Cheques</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Ticket Prom.</Text>
              </View>
              {zones.map((z: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCellBold, { width: '30%' }]}>{z.zone || z.derived_zone_name || z.name}</Text>
                  <Text style={[styles.tableCellRight, { width: '25%' }]}>{fmtCOP(Number(z.total_ventas || z.revenue || 0))}</Text>
                  <Text style={[styles.tableCellRight, { width: '20%' }]}>{z.total_cheques ?? z.cheques ?? '-'}</Text>
                  <Text style={[styles.tableCellRight, { width: '25%' }]}>{(z.total_cheques > 0 || z.cheques > 0) ? fmtCOP(Number(z.total_ventas || z.revenue || 0) / Number(z.total_cheques || z.cheques || 1)) : '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Equipo (Top Meseros) ── */}
        {staff.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo — Top Meseros</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Mesero</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Ventas</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Cheques</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Ticket Prom.</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Propina</Text>
              </View>
              {staff.map((s: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '5%' }]}>{i + 1}</Text>
                  <Text style={[styles.tableCellBold, { width: '25%' }]}>{s.staff_name || s.name || 'Sin nombre'}</Text>
                  <Text style={[styles.tableCellRight, { width: '20%' }]}>{fmtCOP(Number(s.total_ventas || s.revenue || 0))}</Text>
                  <Text style={[styles.tableCellRight, { width: '15%' }]}>{s.total_cheques ?? s.cheques ?? '-'}</Text>
                  <Text style={[styles.tableCellRight, { width: '20%' }]}>{(s.total_cheques > 0 || s.cheques > 0) ? fmtCOP(Number(s.total_ventas || s.revenue || 0) / Number(s.total_cheques || s.cheques || 1)) : '-'}</Text>
                  <Text style={[styles.tableCellRight, { width: '15%' }]}>{fmtCOP(Number(s.total_propina || s.tips || 0))}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Métodos de Pago ── */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Métodos de Pago</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Método</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Total</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Cheques</Text>
              </View>
              {payments.map((p: any, i: number) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCellBold, { width: '50%' }]}>{p.payment_method || p.metodo || p.method}</Text>
                  <Text style={[styles.tableCellRight, { width: '30%' }]}>{fmtCOP(Number(p.total || p.total_ventas || 0))}</Text>
                  <Text style={[styles.tableCellRight, { width: '20%' }]}>{p.cheques || p.total_cheques || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── AI Analysis ── */}
        {analysisSections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Análisis Rayo IA</Text>
            {analysisSections.map((section, i) => (
              <View key={i} style={[styles.analysisSection, SECTION_STYLE_MAP[section.icon] || styles.analysisSectionTrend]}>
                <Text style={styles.analysisTitle}>{section.icon} {section.title}</Text>
                {section.items.map((item, j) => (
                  <Text key={j} style={styles.analysisItem}>• {item}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Junta Summary ── */}
        {kpi && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Resumen para Junta</Text>
            <View style={styles.juntaSummary}>
              <Text style={styles.juntaItem}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Ventas: </Text>
                {fmtCOP(revenue)}{compKpi && cRevenue ? ` (${pctDelta(revenue, cRevenue)?.text})` : ''}
              </Text>
              <Text style={styles.juntaItem}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Clientes: </Text>
                {cheques.toLocaleString('es-CO')}{compKpi && cCheques ? ` (${pctDelta(cheques, cCheques)?.text})` : ''}
              </Text>
              <Text style={styles.juntaItem}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Ticket Promedio: </Text>
                {fmtCOP(ticketProm)}
              </Text>
              {personas > 0 && (
                <Text style={styles.juntaItem}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Personas: </Text>
                  {personas.toLocaleString('es-CO')}{compKpi && cPersonas ? ` (${pctDelta(personas, cPersonas)?.text})` : ''}
                </Text>
              )}
              {propina > 0 && (
                <Text style={styles.juntaItem}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Propina: </Text>
                  {fmtCOP(propina)}
                </Text>
              )}
              <Text style={{ fontSize: 7, color: GRIS_MEDIO, marginTop: 6, fontStyle: 'italic' }}>
                Copia estos datos para el acta de junta directiva.
              </Text>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Informe generado el {new Date().toLocaleDateString('es-CO')} · {from} al {to}
          </Text>
          <Text style={styles.footerBrand}>
            Línea dorada · Rayo IA ⚡ · Attick & Keller
          </Text>
        </View>
      </Page>
    </Document>
  )
}