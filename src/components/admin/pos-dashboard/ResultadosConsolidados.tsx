'use client'

import { useMemo } from 'react'
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react'
import type { POSDashboardData } from '@/lib/hooks/usePOSDashboard'

// ── Types ────────────────────────────────────────────────────────────────────

interface ResultadosConsolidadosProps {
  kpis: POSDashboardData['kpis']
  hourlyRevenue: POSDashboardData['hourlyRevenue']
  dailyTrend: POSDashboardData['dailyTrend']
  filters: { from?: string; to?: string }
}

type DayType = 'alto' | 'medio' | 'bajo'

// ── Constants ────────────────────────────────────────────────────────────────

const CAPACIDAD_MAXIMA = 135
const FRANJA_CAPACIDAD = 45

const PROMEDIOS: Record<DayType, { total: number; almuerzo: number; tarde: number; cena: number }> = {
  alto:  { total: 135, almuerzo: 32, tarde: 37, cena: 67 },
  medio: { total: 64,  almuerzo: 15, tarde: 26, cena: 23 },
  bajo:  { total: 31,  almuerzo: 17, tarde: 12, cena: 3 },
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  alto: 'Alto', medio: 'Medio', bajo: 'Bajo',
}

const DAY_TYPE_DAYS: Record<DayType, string> = {
  alto: 'Vie, Sab', medio: 'Mar, Mie, Jue', bajo: 'Lun, Dom',
}

const DAY_TYPE_INSIGHTS: Record<DayType, string> = {
  alto: 'Maxima ocupacion los viernes y sabados. Proteger capacidad y evitar sobreventa.',
  medio: 'Dias estables. La cena es la franja mas rentable; el almuerzo tiene espacio para crecer.',
  bajo: 'Dias de baja demanda. Cerrar cocina lunes noche y domingo completo reduce perdidas.',
}

type FranjaKey = 'almuerzo' | 'tarde' | 'cena'

const FRANJAS: Record<FranjaKey, { label: string; hours: number[]; timeRange: string }> = {
  almuerzo: { label: 'Almuerzo', hours: [12, 13, 14, 15], timeRange: '12-16h' },
  tarde:    { label: 'Tarde', hours: [17, 18, 19], timeRange: '17-19h' },
  cena:     { label: 'Cena', hours: [20, 21, 22, 23], timeRange: '20-23h' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDayType(dateStr: string): DayType {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  if (day === 5 || day === 6) return 'alto'
  if (day === 2 || day === 3 || day === 4) return 'medio'
  return 'bajo'
}

function getDayName(dateStr: string): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
  const day = new Date(dateStr + 'T12:00:00').getDay()
  return days[day]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${Math.round(amount).toLocaleString('es-CO')}`
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[var(--bg-page)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {label && <span className="text-[10px] text-[var(--text-secondary)] w-20 text-right tabular-nums">{label}</span>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{children}</h3>
}

// ── Main component ───────────────────────────────────────────────────────────

export function ResultadosConsolidados({ kpis, hourlyRevenue, dailyTrend, filters }: ResultadosConsolidadosProps) {
  // ── Compute franja totals from hourly revenue ──
  const franjaTotals = useMemo(() => {
    const result: Record<FranjaKey, { revenue: number; cheques: number }> = {
      almuerzo: { revenue: 0, cheques: 0 },
      tarde:    { revenue: 0, cheques: 0 },
      cena:     { revenue: 0, cheques: 0 },
    }
    for (const h of hourlyRevenue) {
      const hourNum = parseInt(h.hour, 10)
      for (const [key, franja] of Object.entries(FRANJAS)) {
        if ((franja.hours as readonly number[]).includes(hourNum)) {
          result[key as FranjaKey].revenue += h.revenue
          result[key as FranjaKey].cheques += h.cheques
        }
      }
    }
    return result
  }, [hourlyRevenue])

  const totalPeriodCheques = kpis.cheques

  // ── Find last day with data ──
  const lastDay = useMemo(() => {
    const sorted = [...dailyTrend].filter(d => d.cheques > 0).sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0] || null
  }, [dailyTrend])

  const lastDayType = lastDay ? getDayType(lastDay.date) : null
  const lastDayTypeAvg = lastDayType ? PROMEDIOS[lastDayType] : null

  // ── Estimate last day franjas from period proportions ──
  const lastDayFranjas = useMemo(() => {
    if (!lastDay) return null
    const result: Record<FranjaKey, number> = { almuerzo: 0, tarde: 0, cena: 0 }
    if (totalPeriodCheques === 0) return result
    const scale = lastDay.cheques / totalPeriodCheques
    for (const key of Object.keys(FRANJAS) as FranjaKey[]) {
      result[key] = Math.round(franjaTotals[key].cheques * scale)
    }
    return result
  }, [lastDay, totalPeriodCheques, franjaTotals])

  // ── Section 3: trend for same day of week ──
  const sameDayTrend = useMemo(() => {
    if (!lastDay) return []
    const targetDay = new Date(lastDay.date + 'T12:00:00').getDay()
    return dailyTrend
      .filter(d => d.cheques > 0 && new Date(d.date + 'T12:00:00').getDay() === targetDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-4)
  }, [dailyTrend, lastDay])

  const trendDirection = useMemo(() => {
    if (sameDayTrend.length < 2) return { dir: 'stable' as const, pct: 0 }
    const first = sameDayTrend[0].cheques
    const last = sameDayTrend[sameDayTrend.length - 1].cheques
    if (first === 0) return { dir: 'stable' as const, pct: 0 }
    const pct = Math.round(((last - first) / first) * 100)
    if (pct > 5) return { dir: 'up' as const, pct }
    if (pct < -5) return { dir: 'down' as const, pct: Math.abs(pct) }
    return { dir: 'stable' as const, pct }
  }, [sameDayTrend])

  // ── Section 4: day-of-week averages ──
  const weekdayAverages = useMemo(() => {
    const map = new Map<number, { total: number; count: number }>()
    for (const d of dailyTrend) {
      if (d.cheques === 0) continue
      const dow = new Date(d.date + 'T12:00:00').getDay()
      const entry = map.get(dow) || { total: 0, count: 0 }
      entry.total += d.cheques
      entry.count++
      map.set(dow, entry)
    }
    const result: { day: number; avg: number; label: string }[] = []
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    for (const [day, entry] of map) {
      result.push({ day, avg: Math.round(entry.total / entry.count), label: dayLabels[day] })
    }
    result.sort((a, b) => a.avg - b.avg)
    return result
  }, [dailyTrend])

  const weakestDay = weekdayAverages[0] || null

  // ── Section 4: weakest/strongest franja on last day ──
  const franjaAnalysis = useMemo(() => {
    if (!lastDayFranjas || !lastDayTypeAvg) return null
    const entries = (Object.entries(FRANJAS) as [FranjaKey, typeof FRANJAS[FranjaKey]][]).map(([key, franja]) => {
      const actual = lastDayFranjas[key]
      const avg = lastDayTypeAvg[key]
      const pctActual = FRANJA_CAPACIDAD > 0 ? Math.round((actual / FRANJA_CAPACIDAD) * 100) : 0
      const pctAvg = FRANJA_CAPACIDAD > 0 ? Math.round((avg / FRANJA_CAPACIDAD) * 100) : 0
      return { key, label: franja.label, actual, avg, pctActual, pctAvg }
    })
    entries.sort((a, b) => a.pctActual - b.pctActual)
    const weakest = entries[0]
    const strongest = entries[entries.length - 1]
    return { weakest, strongest }
  }, [lastDayFranjas, lastDayTypeAvg])

  // ── Empty state ──
  if (!lastDay) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Sin datos disponibles para el periodo seleccionado.</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Selecciona un rango con actividad para ver los resultados consolidados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ═══ SECCION 1: RESUMEN POR TIPO DE DIA ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
        <SectionTitle>Resumen por tipo de dia (Mayo 2026)</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(PROMEDIOS) as [DayType, typeof PROMEDIOS[DayType]][]).map(([type, data]) => {
            const pctTotal = Math.round((data.total / CAPACIDAD_MAXIMA) * 100)
            return (
              <div key={type} className="bg-[var(--bg-page)] rounded-lg p-3 border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{DAY_TYPE_LABELS[type]}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">{DAY_TYPE_DAYS[type]}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-[var(--text-primary)]">{data.total}</span>
                  <span className="text-xs text-[var(--text-secondary)]">cheques/dia ({pctTotal}% cap)</span>
                </div>
                <div className="space-y-1 mb-2">
                  {(['almuerzo', 'tarde', 'cena'] as const).map(f => (
                    <div key={f} className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-secondary)]">{FRANJAS[f].label}</span>
                      <span className="text-[var(--text-primary)] tabular-nums">
                        {data[f]}/{FRANJA_CAPACIDAD}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-ak-borgona)] leading-relaxed">
                  {DAY_TYPE_INSIGHTS[type]}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ SECCION 2: ULTIMO DIA CONSOLIDADO ═══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
        <SectionTitle>Ultimo dia consolidado</SectionTitle>

        {/* Day header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {formatShortDate(lastDay.date)} - {getDayName(lastDay.date)}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)] font-medium">
            Tipo {lastDayType ? DAY_TYPE_LABELS[lastDayType] : '--'}
          </span>
        </div>

        {/* KPIs row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[var(--bg-page)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--text-secondary)]">Total cheques</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{lastDay.cheques}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {Math.round((lastDay.cheques / CAPACIDAD_MAXIMA) * 100)}% cap
            </p>
          </div>
          <div className="bg-[var(--bg-page)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--text-secondary)]">Ticket promedio</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {lastDay.cheques > 0 ? formatCurrency(lastDay.revenue / lastDay.cheques) : '$0'}
            </p>
          </div>
          <div className="bg-[var(--bg-page)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--text-secondary)]">Revenue total</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(lastDay.revenue)}</p>
          </div>
          <div className="bg-[var(--bg-page)] rounded-lg p-2.5">
            <p className="text-[10px] text-[var(--text-secondary)]">Personas</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{lastDay.personas}</p>
          </div>
        </div>

        {/* Franja comparison */}
        {lastDayFranjas && lastDayTypeAvg && (
          <div className="space-y-3">
            {(Object.entries(FRANJAS) as [FranjaKey, typeof FRANJAS[FranjaKey]][]).map(([key, franja]) => {
              const actual = lastDayFranjas[key]
              const avg = lastDayTypeAvg[key]
              const pctActual = Math.round((actual / FRANJA_CAPACIDAD) * 100)
              const pctAvg = Math.round((avg / FRANJA_CAPACIDAD) * 100)
              const diff = avg > 0 ? Math.round(((actual - avg) / avg) * 100) : 0
              const diffSign = diff >= 0 ? '+' : ''
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">{franja.label}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                      {actual}/{FRANJA_CAPACIDAD} ({pctActual}%) vs {lastDayType ? DAY_TYPE_LABELS[lastDayType] : '--'}: {avg}/{FRANJA_CAPACIDAD} ({pctAvg}%) &rarr; {diffSign}{diff}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <ProgressBar
                        value={actual}
                        max={FRANJA_CAPACIDAD}
                        color="var(--color-ak-borgona)"
                        label={`${actual}/${FRANJA_CAPACIDAD}`}
                      />
                      <ProgressBar
                        value={avg}
                        max={FRANJA_CAPACIDAD}
                        color="color-mix(in srgb, var(--color-ak-borgona) 30%, transparent)"
                        label={`prom ${avg}/${FRANJA_CAPACIDAD}`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Diagnosis */}
        {lastDayType && lastDayTypeAvg && (
          <DiagnosticoDia
            cheques={lastDay.cheques}
            typeAvg={lastDayTypeAvg.total}
            dayType={lastDayType}
            lastDayFranjas={lastDayFranjas}
          />
        )}
      </div>

      {/* ═══ SECCION 3: TENDENCIA 4 SEMANAS ═══ */}
      {sameDayTrend.length >= 2 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <SectionTitle>
            Ultimos {sameDayTrend.length} {lastDay ? getDayName(lastDay.date) + 's' : 'dias'}
          </SectionTitle>
          <div className="flex items-end gap-3 mb-3">
            {sameDayTrend.map((d, i) => {
              const pct = CAPACIDAD_MAXIMA > 0 ? (d.cheques / CAPACIDAD_MAXIMA) * 100 : 0
              const isLast = i === sameDayTrend.length - 1
              return (
                <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] font-medium text-[var(--text-primary)] tabular-nums">{d.cheques}</span>
                  <div className="w-full h-16 bg-[var(--bg-page)] rounded-md overflow-hidden relative">
                    <div
                      className="absolute bottom-0 w-full rounded-md transition-all"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        backgroundColor: isLast ? 'var(--color-ak-borgona)' : 'color-mix(in srgb, var(--color-ak-borgona) 50%, transparent)',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)]">{formatShortDate(d.date)}</span>
                </div>
              )
            })}
          </div>
          <TrendIndicator direction={trendDirection.dir} pct={trendDirection.pct} />
        </div>
      )}

      {/* ═══ SECCION 4: OPORTUNIDADES Y ESTRATEGIAS ═══ */}
      {lastDayType && lastDayTypeAvg && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <SectionTitle>Oportunidades y estrategias</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Weakest franja */}
            {franjaAnalysis && (
              <OportunidadCard
                label={`${franjaAnalysis.weakest.label}: ${franjaAnalysis.weakest.pctActual}% cap`}
                description={`Franja mas debil para un ${DAY_TYPE_LABELS[lastDayType].toLowerCase()}. Paquete corporativo ejecutivo. Impacto estimado: +10 chq/semana = +$12M/mes.`}
              />
            )}

            {/* Strongest franja */}
            {franjaAnalysis && franjaAnalysis.strongest.key !== franjaAnalysis.weakest.key && (
              <OportunidadCard
                label={`${franjaAnalysis.strongest.label}: ${franjaAnalysis.strongest.pctActual}% cap`}
                description={`Ya funciona a nivel ${lastDayType}. Proteger, no descontar. Mantener calidad de servicio en esta franja.`}
              />
            )}

            {/* Weakest day of week */}
            {weakestDay && (
              <OportunidadCard
                label={`Dia mas debil: ${weakestDay.label} (${weakestDay.avg} chq/dia)`}
                description={
                  weakestDay.day === 0
                    ? 'Domingo consistentemente bajo. Considerar cierre o evento tematico tipo brunch.'
                    : weakestDay.day === 1
                      ? 'Lunes consistentemente bajo. Evaluar cierre de cocina en la noche.'
                      : `${weakestDay.label} es el dia con menor actividad. Evento tematico o promocion para atraer trafico.`
                }
              />
            )}

            {/* Trend card */}
            <OportunidadCard
              label={trendDirection.dir === 'up' ? 'Tendencia positiva' : trendDirection.dir === 'down' ? 'Tendencia negativa' : 'Tendencia estable'}
              description={
                trendDirection.dir === 'up'
                  ? `Los ultimos ${sameDayTrend.length} ${lastDay ? getDayName(lastDay.date) + 's' : 'dias'} vienen subiendo +${trendDirection.pct}%. Replicar acciones que estan funcionando.`
                  : trendDirection.dir === 'down'
                    ? `Cayendo -${trendDirection.pct}% en las ultimas ${sameDayTrend.length} semanas. Investigar causa: clima, competencia, servicio.`
                    : `Sin cambios significativos. Oportunidad de probar iniciativas para romper la meseta.`
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DiagnosticoDia({ cheques, typeAvg, dayType, lastDayFranjas }: { cheques: number; typeAvg: number; dayType: DayType; lastDayFranjas: Record<FranjaKey, number> | null }) {
  const diffPct = typeAvg > 0 ? Math.round(((cheques - typeAvg) / typeAvg) * 100) : 0
  const diffSign = diffPct >= 0 ? '+' : ''
  const diffAbs = Math.abs(diffPct)

  let message: string
  if (diffPct > 15) {
    message = `Viene fuerte, ${diffSign}${diffPct}% arriba del promedio para un ${DAY_TYPE_LABELS[dayType].toLowerCase()}.`
  } else if (diffPct < -15) {
    message = `Dia debil, ${diffPct}% abajo del promedio para un ${DAY_TYPE_LABELS[dayType].toLowerCase()}.`
  } else {
    message = `Dia normal para un ${DAY_TYPE_LABELS[dayType].toLowerCase()}.`
  }

  // Additional diagnosis
  const extraMessages: string[] = []
  if (lastDayFranjas) {
    const cenaPct = Math.round((lastDayFranjas.cena / FRANJA_CAPACIDAD) * 100)
    if (cenaPct > 80 && dayType === 'medio') {
      extraMessages.push('La cena viene explotando — casi nivel viernes.')
    }
    const almuerzoPct = Math.round((lastDayFranjas.almuerzo / FRANJA_CAPACIDAD) * 100)
    if (almuerzoPct < 35 && dayType === 'medio') {
      extraMessages.push('Almuerzo debil, oportunidad de paquete corporativo.')
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-default)] space-y-1">
      <p className="text-xs text-[var(--color-ak-borgona)] font-medium">{message}</p>
      {extraMessages.map((m, i) => (
        <p key={i} className="text-xs text-[var(--color-ak-borgona)] font-medium">{m}</p>
      ))}
    </div>
  )
}

function TrendIndicator({ direction, pct }: { direction: 'up' | 'down' | 'stable'; pct: number }) {
  if (direction === 'up') {
    return (
      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-ak-borgona)' }}>
        <TrendUp size={14} />
        <span>Recuperando +{pct}%</span>
      </div>
    )
  }
  if (direction === 'down') {
    return (
      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-danger, #dc2626)' }}>
        <TrendDown size={14} />
        <span>Cayendo -{pct}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
      <Minus size={14} />
      <span>Estable</span>
    </div>
  )
}

function OportunidadCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="bg-[var(--bg-page)] rounded-lg p-3 border border-[var(--border-default)]">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </div>
  )
}
