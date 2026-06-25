'use client'

import { useState, useEffect, useMemo } from 'react'
import { useInformesRayo } from '@/lib/hooks/useInformesRayo'
import { useProductoHourly } from '@/lib/hooks/useProductoHourly'
import { useProductMargins } from '@/lib/hooks/useProductMargins'
import { useSemanticModel } from '@/lib/hooks/useSemanticModel'
import { MetricasClave } from './MetricasClave'
import { RentabilidadPanel } from './RentabilidadPanel'
import { WhatsAppExportButton } from './WhatsAppExportButton'
import { InformesDashboard } from './InformesDashboard'
import { ProductoDesgloseTable } from './ProductoDesgloseTable'
import { NominaRatioCard } from './NominaRatioCard'
import { RecargosNominaGrid } from './RecargosNominaGrid'
import { OperacionHoraChart } from './OperacionHoraChart'
import { GapsCoberturaAlerts } from './GapsCoberturaAlerts'
import { ProductividadAreaRadar } from './ProductividadAreaRadar'
import { ReservasConversionTable } from './ReservasConversionTable'
import {
  Lightning, CaretLeft, CaretRight, Spinner, Warning,
  ClipboardText, HandCoins, FileText, ChartLineUp
} from '@phosphor-icons/react'

type PeriodPreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'
type CompareMode = 'previousPeriod' | 'none'

function getColombiaDate(d?: Date): Date {
  const now = d || new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  const diff = day === 0 ? 6 : day - 1
  r.setDate(r.getDate() - diff)
  return r
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d)
  return addDays(s, 6)
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function calculatePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string) {
  const now = getColombiaDate()
  let from: string, to: string

  switch (preset) {
    case 'today':
      from = to = formatDateLocal(now)
      break
    case 'yesterday':
      from = to = formatDateLocal(addDays(now, -1))
      break
    case 'thisWeek':
      from = formatDateLocal(startOfWeek(now))
      to = formatDateLocal(now)
      break
    case 'lastWeek': {
      const lw = addDays(startOfWeek(now), -7)
      from = formatDateLocal(lw)
      to = formatDateLocal(addDays(lw, 6))
      break
    }
    case 'thisMonth':
      from = formatDateLocal(startOfMonth(now))
      to = formatDateLocal(now)
      break
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      from = formatDateLocal(lm)
      to = formatDateLocal(endOfMonth(lm))
      break
    }
    case 'custom':
      from = customFrom || formatDateLocal(now)
      to = customTo || formatDateLocal(now)
      break
  }

  return { from, to }
}

function calculateComparison(from: string, to: string, mode: CompareMode) {
  if (mode === 'none') return { compareFrom: '', compareTo: '' }
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T00:00:00')
  const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (86400000)) + 1
  const compTo = formatDateLocal(addDays(fromDate, -1))
  const compFrom = formatDateLocal(addDays(fromDate, -daysDiff))
  return { compareFrom: compFrom, compareTo: compTo }
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'thisWeek', label: 'Esta Semana' },
  { key: 'lastWeek', label: 'Sem. Anterior' },
  { key: 'thisMonth', label: 'Este Mes' },
  { key: 'lastMonth', label: 'Mes Anterior' },
  { key: 'custom', label: 'Personalizado' },
]

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function InformesRayoPanel() {
  const { data, loading, error, fetchReport } = useInformesRayo()
  const { data: productoData, loading: prodLoading, error: prodError, fetchData: fetchProductos } = useProductoHourly()
  const [preset, setPreset] = useState<PeriodPreset>('thisWeek')
  const [compareMode, setCompareMode] = useState<CompareMode>('previousPeriod')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [zone, setZone] = useState('all')
  const [fetched, setFetched] = useState(false)

  const { from, to } = useMemo(() => calculatePeriod(preset, customFrom, customTo), [preset, customFrom, customTo])
  const { compareFrom, compareTo } = useMemo(() => calculateComparison(from, to, compareMode), [from, to, compareMode])

  // Márgenes para alimentar el análisis LLM
  const { data: marginsData } = useProductMargins(from, to, '')

  // Modelo semántico (views materializadas) — opcional, no bloquea el informe principal
  const semantic = useSemanticModel()

  useEffect(() => {
    fetchReport(from, to, zone, compareFrom, compareTo)
    setFetched(true)
  }, [])

  const handleFetch = () => {
    fetchReport(from, to, zone, compareFrom, compareTo)
  }

  useEffect(() => {
    if (fetched) fetchReport(from, to, zone, compareFrom, compareTo)
  }, [preset, customFrom, customTo, compareMode, zone])

  useEffect(() => {
    if (fetched) fetchProductos(from, to, zone)
  }, [from, to, zone, fetched])

  // Fetch del modelo semántico cuando cambia el período (opcional)
  useEffect(() => {
    if (fetched) semantic.fetchAll(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fetched])

  const periodLabel = useMemo(() => {
    const f = new Date(from + 'T00:00:00')
    const t = new Date(to + 'T00:00:00')
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
    if (from === to) return fmt(f)
    return `${fmt(f)} — ${fmt(t)}`
  }, [from, to])

  const compLabel = useMemo(() => {
    if (!compareFrom || !compareTo) return ''
    const f = new Date(compareFrom + 'T00:00:00')
    const t = new Date(compareTo + 'T00:00:00')
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
    return `vs ${fmt(f)} — ${fmt(t)}`
  }, [compareFrom, compareTo])

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]" style={{ boxShadow: 'var(--shadow-card)' }}>
            <Lightning size={22} weight="fill" className="text-[var(--color-ak-dorado)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Informes Rayo</h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reportes con datos en vivo</p>
          </div>
        </div>
        {data && !loading && (
          <WhatsAppExportButton
            data={data}
            from={from}
            to={to}
            kpis={data?.kpis}
            zones={data?.zones}
            payments={data?.payments}
            comparison={data?.comparison as { kpis: any } | null}
            marginsData={marginsData}
            staff={data?.staff}
            daily={data?.daily}
            clientSplit={data?.clientSplit}
            productoData={productoData}
          />
        )}
      </div>

      {/* ── Period Selector ── */}
      <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4 space-y-3 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10">
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
              style={preset === p.key
                ? { background: 'var(--color-ak-borgona)', color: '#fff' }
                : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom dates */}
        {preset === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setPreset('custom') }}
              className="rounded-lg px-3 py-1.5 text-sm border"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setPreset('custom') }}
              className="rounded-lg px-3 py-1.5 text-sm border"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        )}

        {/* Compare toggle + period label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCompareMode(compareMode === 'previousPeriod' ? 'none' : 'previousPeriod')}
              className="px-3 py-1 text-xs font-medium rounded-lg transition-all"
              style={compareMode === 'previousPeriod'
                ? { background: 'var(--color-ak-borgona)', color: '#fff' }
                : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
              }
            >
              {compareMode === 'previousPeriod' ? 'vs período anterior' : 'sin comparar'}
            </button>
            {compLabel && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{compLabel}</span>
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {periodLabel}
          </span>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} className="animate-spin" style={{ color: 'var(--color-ak-borgona)' }} />
          <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando informe...</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(var(--color-danger), 0.1)', border: '1px solid var(--color-danger)' }}>
          <Warning size={20} style={{ color: 'var(--color-danger)' }} />
          <span className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {data && !loading && (
        <MetricasClave data={data.kpis} comparison={data.comparison as { kpis: any } | null} />
      )}

      {/* ── RENTABILIDAD ── */}
      <RentabilidadPanel from={from} to={to} />

      {/* ── Dashboard Charts ── */}
      {data && !loading && (
        <InformesDashboard data={data} />
      )}

      {/* ── Producto Desglose: Hora x Dia ── */}
      <ProductoDesgloseTable
        data={productoData || []}
        loading={prodLoading}
        error={prodError}
        from={from}
        to={to}
      />

      {/* ── Modelo Semántico (views materializadas) ── */}
      {fetched && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <ChartLineUp size={18} weight="fill" className="text-[var(--color-ak-dorado)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Modelo Semántico</h3>
            {semantic.loading && (
              <Spinner size={14} className="animate-spin text-[var(--color-ak-borgona)]" />
            )}
          </div>

          {semantic.error && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-xs" style={{ background: 'rgba(196,77,99,0.10)', border: '1px solid rgba(196,77,99,0.4)', color: 'rgb(196,77,99)' }}>
              <Warning size={14} />
              {semantic.error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NominaRatioCard data={semantic.nominaVsVentas} />
            <OperacionHoraChart data={semantic.revenueVsTurnos} />
          </div>

          <RecargosNominaGrid
            dataHorasExtra={semantic.horasExtra}
            dataHorasNocturnas={semantic.horasNocturnas}
          />

          <ProductividadAreaRadar data={semantic.productividadArea} />
          <GapsCoberturaAlerts data={semantic.gapsCobertura} />
          <ReservasConversionTable data={semantic.reservasVsVentas} />
        </div>
      )}

      {/* ── Junta Summary ── */}
      {data && data.kpis && !loading && (() => {
        const kpi = data.kpis
        const compKpi = data.comparison?.kpis
        const revenue = Number(kpi?.total_ventas ?? 0)
        const cheques = Number(kpi?.total_cheques ?? 0)
        const ticketProm = cheques > 0 ? Math.round(revenue / cheques) : 0
        const personas = Number(kpi?.personas ?? 0)
        const propina = Number(kpi?.propina_total ?? 0)
        const propinaPerCapita = personas > 0 ? Math.round(propina / personas) : 0

        const cRevenue = compKpi ? Number(compKpi.total_ventas ?? 0) : 0
        const cCheques = compKpi ? Number(compKpi.total_cheques ?? 0) : 0
        const cPersonas = compKpi ? Number(compKpi.personas ?? 0) : 0

        const fmtC = (n: number) => {
          if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
          if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
          return `$${n.toLocaleString('es-CO')}`
        }
        const fmtN = (n: number) => Math.round(n).toLocaleString('es-CO')
        const pct = (c: number, p: number) => !p ? '' : ` (${c >= p ? '↑' : '↓'}${Math.abs(((c - p) / p) * 100).toFixed(1)}%)`

        return (
          <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4 bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--color-ak-dorado)]">
              <ClipboardText size={16} weight="fill" />
              Resumen para Junta
            </h3>
            <div className="space-y-1.5 pl-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ventas:</span> {fmtC(revenue)}{pct(revenue, cRevenue)}</p>
              <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Cheques:</span> {fmtN(cheques)}{pct(cheques, cCheques)}</p>
              <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ticket Promedio:</span> {fmtC(ticketProm)}</p>
              {personas > 0 && <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Personas:</span> {fmtN(personas)}{pct(personas, cPersonas)}</p>}
              {propina > 0 && <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Propina:</span> {fmtC(propina)}</p>}
              {propinaPerCapita > 0 && <p><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Propina/Persona:</span> {fmtC(propinaPerCapita)}</p>}
            </div>
            <p className="text-xs italic mt-3" style={{ color: 'var(--text-muted)' }}>
              Copia estos datos para el acta de junta directiva.
            </p>
          </div>
        )
      })()}

      {/* ── Empty State ── */}
      {!data && !loading && !error && fetched && (
        <div className="text-center py-12">
          <Lightning size={40} className="mx-auto opacity-30 text-[var(--text-secondary)] dark:text-[var(--color-ak-madera-light)]" />
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Selecciona un período para ver el informe</p>
        </div>
      )}
    </div>
  )
}