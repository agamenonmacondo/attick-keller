'use client'

import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle, G, Line, Rect } from '@react-pdf/renderer'

// ── A&K Brand Colors ──
const BORGONA = '#5D1528'
const DORADO = '#C9A94E'
const CREMA = '#FFF8E7'
const MADERA = '#3E2723'
const LADRILLO = '#A0522D'
const WHITE = '#FFFFFF'
const GRAY_400 = '#9CA3AF'
const GRAY_700 = '#374151'
const GRAY_200 = '#E5E7EB'

// ── Styles ──
const styles = StyleSheet.create({
  // ── Portada (Page 1) ──
  portadaPage: {
    backgroundColor: BORGONA,
    padding: 0,
  },
  portadaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  portadaFrame: {
    border: `2px solid ${DORADO}`,
    borderRadius: 4,
    padding: 40,
    alignItems: 'center',
    width: '80%',
  },
  portadaIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: DORADO,
  },
  portadaTitle: {
    fontSize: 32,
    color: DORADO,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  portadaSubtitle: {
    fontSize: 14,
    color: CREMA,
    textAlign: 'center',
    marginBottom: 24,
  },
  portadaPeriodo: {
    fontSize: 12,
    color: CREMA,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 4,
  },
  portadaBrand: {
    fontSize: 10,
    color: DORADO,
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: 3,
    opacity: 0.7,
  },

  // ── Data Page (Page 2+) ──
  dataPage: {
    backgroundColor: WHITE,
    padding: 32,
    fontFamily: 'Helvetica',
  },
  pageHeader: {
    borderBottom: `2px solid ${DORADO}`,
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BORGONA,
  },
  pagePeriod: {
    fontSize: 10,
    color: GRAY_400,
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
    backgroundColor: CREMA,
    borderRadius: 4,
    padding: 10,
    borderLeft: `3px solid ${BORGONA}`,
  },
  kpiLabel: {
    fontSize: 8,
    color: GRAY_400,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BORGONA,
  },
  kpiDelta: {
    fontSize: 9,
    marginTop: 2,
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BORGONA,
    marginBottom: 8,
    marginTop: 4,
    borderBottom: `1px solid ${DORADO}`,
    paddingBottom: 4,
  },

  // ── Pagos Pie Chart ──
  pieRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  pieLegend: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 9,
    color: GRAY_700,
  },
  legendValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: MADERA,
  },

  // ── Top Products Bars ──
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    width: 90,
    fontSize: 7,
    color: GRAY_700,
    textAlign: 'right',
    paddingRight: 6,
  },
  barFill: {
    height: 12,
    borderRadius: 2,
  },
  barValue: {
    width: 60,
    fontSize: 7,
    color: MADERA,
    paddingLeft: 6,
  },

  // ── Analysis Text ──
  analysisBox: {
    backgroundColor: CREMA,
    borderRadius: 4,
    padding: 12,
    borderLeft: `3px solid ${DORADO}`,
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.5,
  },

  // ── Junta Summary ──
  juntaBox: {
    backgroundColor: BORGONA,
    borderRadius: 4,
    padding: 12,
  },
  juntaTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DORADO,
    marginBottom: 6,
  },
  juntaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: CREMA,
    marginBottom: 2,
  },
  juntaValue: {
    fontWeight: 'bold',
    color: DORADO,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 7,
    color: GRAY_400,
    borderTop: `1px solid ${GRAY_200}`,
    paddingTop: 4,
  },
})

// ── Helpers ──

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-CO')
}

function pct(current: number, previous: number): string {
  if (!previous) return ''
  const diff = ((current - previous) / previous) * 100
  const arrow = diff >= 0 ? '↑' : '↓'
  return `${arrow}${Math.abs(diff).toFixed(1)}%`
}

type PagoSlice = { label: string; value: number; color: string }

function computePieSlices(total: number, pagos: any[]): PagoSlice[] {
  const labels = ['Efectivo', 'Tarjeta', 'Transferencia']
  const keys = ['efectivo', 'tarjeta', 'transferencia']
  const colors = [BORGONA, DORADO, LADRILLO]
  return keys
    .map((k, i) => {
      const raw = pagos?.find((p: any) => {
        const n = (p.name || p.metodo || '').toLowerCase()
        return n.includes(k.toLowerCase())
      })
      const value = raw ? Number(raw.total ?? raw.value ?? 0) : 0
      return { label: labels[i], value, color: colors[i] }
    })
    .filter(s => s.value > 0)
}

// SVG Donut Chart para cada slice
function DonutSlice({ slices, size = 140 }: { slices: PagoSlice[]; size?: number }) {
  const total = slices.reduce((s, c) => s + c.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = outerR * 0.55

  let startAngle = -90

  const paths = slices.map(slice => {
    const sliceAngle = (slice.value / total) * 360
    const endAngle = startAngle + sliceAngle

    const x1 = cx + outerR * Math.cos((startAngle * Math.PI) / 180)
    const y1 = cy + outerR * Math.sin((startAngle * Math.PI) / 180)
    const x2 = cx + outerR * Math.cos((endAngle * Math.PI) / 180)
    const y2 = cy + outerR * Math.sin((endAngle * Math.PI) / 180)
    const x3 = cx + innerR * Math.cos((endAngle * Math.PI) / 180)
    const y3 = cy + innerR * Math.sin((endAngle * Math.PI) / 180)
    const x4 = cx + innerR * Math.cos((startAngle * Math.PI) / 180)
    const y4 = cy + innerR * Math.sin((startAngle * Math.PI) / 180)

    const large = sliceAngle > 180 ? 1 : 0

    const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
    const path = { d, color: slice.color }

    startAngle = endAngle
    return path
  })

  // Calculate center percentage
  const biggestSlice = slices.reduce((a, b) => (b.value > a.value ? b : a), slices[0])
  const pctBiggest = slices.length > 0 ? Math.round((biggestSlice.value / total) * 100) : 0

  return (
    <Svg width={size} height={size}>
      {paths.map((p, i) => (
        <Path key={i} d={p.d} fill={p.color} />
      ))}
      <Circle cx={cx} cy={cy} r={innerR - 2} fill={WHITE} />
      {/* Center text */}
    </Svg>
  )
}

// ── Props ──
interface InformeRayoPDFProps {
  data: any
  from: string
  to: string
  analysis: string | null
  productHourly?: any[]
}

// ── Format period ──
function formatPeriod(from: string, to: string): string {
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const f = new Date(from + 'T00:00:00')
  const t = new Date(to + 'T00:00:00')
  const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (from === to) return fmt(f)
  return `${fmt(f)} — ${fmt(t)}`
}

// ── Document ──
export function InformeRayoPDF({ data, from, to, analysis, productHourly }: InformeRayoPDFProps) {
  const kpi = data?.kpis || {}
  const compKpi = data?.comparison?.kpis || null

  const revenue = Number(kpi?.total_ventas ?? 0)
  const cheques = Number(kpi?.total_cheques ?? 0)
  const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
  const personas = Number(kpi?.personas ?? 0)
  const propina = Number(kpi?.propina_total ?? 0)
  const propinaPerCapita = personas > 0 ? Math.round(propina / personas) : 0

  const cRevenue = compKpi ? Number(compKpi.total_ventas ?? 0) : 0
  const cCheques = compKpi ? Number(compKpi.total_cheques ?? 0) : 0
  const cPersonas = compKpi ? Number(compKpi.personas ?? 0) : 0
  const cPropina = compKpi ? Number(compKpi.propina_total ?? 0) : 0

  const pagos = data?.pagos || []
  const zonas = data?.zonas || []
  const productos = data?.productos || []

  const pieSlices = computePieSlices(revenue, pagos)
  const top10 = productos.slice(0, 10)
  const maxProdRevenue = top10.length > 0 ? Math.max(...top10.map((p: any) => Number(p.total_ventas ?? p.revenue ?? 0))) : 1

  const periodo = formatPeriod(from, to)

  return (
    <Document>
      {/* ══════ PAGE 1: PORTADA ══════ */}
      <Page size="A4" style={styles.portadaPage}>
        <View style={styles.portadaContainer}>
          <View style={styles.portadaFrame}>
            <Text style={styles.portadaIcon}>⚡</Text>
            <Text style={styles.portadaTitle}>INFORME RAYO</Text>
            <Text style={styles.portadaSubtitle}>Reporte de Ventas & Analisis</Text>
            <Text style={styles.portadaPeriodo}>{periodo}</Text>
            {data?.zonaNombre && data.zonaNombre !== 'all' && (
              <Text style={styles.portadaPeriodo}>Zona: {data.zonaNombre}</Text>
            )}
            <Text style={styles.portadaBrand}>ATTICK & KELLER</Text>
          </View>
        </View>
      </Page>

      {/* ══════ PAGE 2: KPIs + GRAFICOS ══════ */}
      <Page size="A4" style={styles.dataPage}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Metricas Clave</Text>
          <Text style={styles.pagePeriod}>{periodo}</Text>
        </View>

        {/* ── KPI Cards 2x3 Grid ── */}
        <View style={styles.kpiGrid}>
          {/* Ventas */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ventas Totales</Text>
            <Text style={styles.kpiValue}>{fmtCOP(revenue)}</Text>
            {compKpi && (
              <Text style={{ ...styles.kpiDelta, color: revenue >= cRevenue ? '#16a34a' : '#dc2626' }}>
                {pct(revenue, cRevenue)} vs periodo ant.
              </Text>
            )}
          </View>

          {/* Cheques */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Cheques</Text>
            <Text style={styles.kpiValue}>{fmtN(cheques)}</Text>
            {compKpi && (
              <Text style={{ ...styles.kpiDelta, color: cheques >= cCheques ? '#16a34a' : '#dc2626' }}>
                {pct(cheques, cCheques)} vs periodo ant.
              </Text>
            )}
          </View>

          {/* Ticket Promedio */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ticket Promedio</Text>
            <Text style={styles.kpiValue}>{fmtCOP(ticketProm)}</Text>
          </View>

          {/* Personas */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Personas</Text>
            <Text style={styles.kpiValue}>{fmtN(personas)}</Text>
            {compKpi && (
              <Text style={{ ...styles.kpiDelta, color: personas >= cPersonas ? '#16a34a' : '#dc2626' }}>
                {pct(personas, cPersonas)} vs periodo ant.
              </Text>
            )}
          </View>

          {/* Propina */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Propina Total</Text>
            <Text style={styles.kpiValue}>{fmtCOP(propina)}</Text>
          </View>

          {/* Propina/Persona */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Propina / Persona</Text>
            <Text style={styles.kpiValue}>{fmtCOP(propinaPerCapita)}</Text>
          </View>
        </View>

        {/* ── Pagos: Donut Chart ── */}
        {pieSlices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Distribucion de Pagos</Text>
            <View style={styles.pieRow}>
              <DonutSlice slices={pieSlices} size={120} />
              <View style={styles.pieLegend}>
                {pieSlices.map((s, i) => {
                  const pctVal = Math.round((s.value / (revenue || 1)) * 100)
                  return (
                    <View key={i} style={styles.legendItem}>
                      <View style={{ ...styles.legendDot, backgroundColor: s.color }} />
                      <Text style={styles.legendLabel}>{s.label}:</Text>
                      <Text style={styles.legendValue}>{fmtCOP(s.value)} ({pctVal}%)</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </>
        )}

        {/* ── Top Productos: Barras ── */}
        {top10.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Productos</Text>
            {top10.map((p: any, i: number) => {
              const val = Number(p.total_ventas ?? p.revenue ?? 0)
              const w = Math.max((val / maxProdRevenue) * 220, 4)
              const barColor = i < 3 ? DORADO : i < 6 ? LADRILLO : GRAY_400
              return (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel}>{p.name?.substring(0, 16) || `Producto ${i + 1}`}</Text>
                  <View style={{ ...styles.barFill, width: w, backgroundColor: barColor }} />
                  <Text style={styles.barValue}>{fmtCOP(val)}</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>Attick & Keller — Informe Rayo — Generado el {new Date().toLocaleDateString('es-CO')}</Text>
      </Page>

      {/* ══════ PAGE 3: ANALISIS IA + RESUMEN JUNTA ══════ */}
      <Page size="A4" style={styles.dataPage}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Analisis & Resumen Ejecutivo</Text>
          <Text style={styles.pagePeriod}>{periodo}</Text>
        </View>

        {/* ── Analisis IA ── */}
        {(analysis || data?.analysis) && (
          <>
            <Text style={styles.sectionTitle}>Analisis Inteligente</Text>
            <View style={styles.analysisBox}>
              <Text style={styles.analysisText}>
                {analysis || data?.analysis || 'No hay analisis disponible para este periodo.'}
              </Text>
            </View>
          </>
        )}

        {/* ── Resumen para Junta ── */}
        <Text style={{ ...styles.sectionTitle, marginTop: 12 }}>Resumen para Junta Directiva</Text>
        <View style={styles.juntaBox}>
          <Text style={styles.juntaTitle}>Datos Clave del Periodo</Text>
          <View style={styles.juntaRow}>
            <Text>Ventas Totales:</Text>
            <Text style={styles.juntaValue}>{fmtCOP(revenue)}</Text>
          </View>
          <View style={styles.juntaRow}>
            <Text>Cheques:</Text>
            <Text style={styles.juntaValue}>{fmtN(cheques)}</Text>
          </View>
          <View style={styles.juntaRow}>
            <Text>Ticket Promedio:</Text>
            <Text style={styles.juntaValue}>{fmtCOP(ticketProm)}</Text>
          </View>
          {personas > 0 && (
            <View style={styles.juntaRow}>
              <Text>Personas Atendidas:</Text>
              <Text style={styles.juntaValue}>{fmtN(personas)}</Text>
            </View>
          )}
          {propina > 0 && (
            <View style={styles.juntaRow}>
              <Text>Propina Total:</Text>
              <Text style={styles.juntaValue}>{fmtCOP(propina)}</Text>
            </View>
          )}
          {propinaPerCapita > 0 && (
            <View style={styles.juntaRow}>
              <Text>Propina por Persona:</Text>
              <Text style={styles.juntaValue}>{fmtCOP(propinaPerCapita)}</Text>
            </View>
          )}

          {/* Comparacion si existe */}
          {compKpi && (
            <>
              <View style={{ height: 1, backgroundColor: DORADO, marginVertical: 8, opacity: 0.3 }} />
              <Text style={{ fontSize: 8, color: DORADO, marginBottom: 4 }}>Variacion vs Periodo Anterior</Text>
              <View style={styles.juntaRow}>
                <Text>Ventas:</Text>
                <Text style={{ ...styles.juntaValue, fontSize: 8 }}>{pct(revenue, cRevenue)}</Text>
              </View>
              <View style={styles.juntaRow}>
                <Text>Cheques:</Text>
                <Text style={{ ...styles.juntaValue, fontSize: 8 }}>{pct(cheques, cCheques)}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Zonas (si hay datos) ── */}
        {zonas.length > 0 && (
          <>
            <Text style={{ ...styles.sectionTitle, marginTop: 16 }}>Ventas por Zona</Text>
            {zonas.slice(0, 6).map((z: any, i: number) => {
              const zVal = Number(z.total_ventas ?? z.revenue ?? 0)
              const zPct = revenue > 0 ? Math.round((zVal / revenue) * 100) : 0
              const barW = Math.max((zVal / (revenue || 1)) * 300, 4)
              return (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel}>{z.name?.substring(0, 12) || `Zona ${i + 1}`}</Text>
                  <View style={{ ...styles.barFill, width: barW, backgroundColor: DORADO }} />
                  <Text style={styles.barValue}>{fmtCOP(zVal)} ({zPct}%)</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>Attick & Keller — Informe Rayo — Generado el {new Date().toLocaleDateString('es-CO')}</Text>
      </Page>
    </Document>
  )
}
