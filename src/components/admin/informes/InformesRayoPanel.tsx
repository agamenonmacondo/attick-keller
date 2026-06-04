'use client'

import { useState, useEffect, useMemo } from 'react'
import { useInformesRayo } from '@/lib/hooks/useInformesRayo'
import { MetricasClave } from './MetricasClave'
import { AnalisisIA } from './AnalisisIA'
import { PDFExportButton } from './PDFExportButton'
import { Lightning, CaretLeft, CaretRight, Spinner, Warning, Funnel, Sparkle, TrendUp, TrendDown, Lightbulb, ClipboardText, Package, HandCoins } from '@phosphor-icons/react'

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
  const diff = day === 0 ? 6 : day - 1 // Monday start
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

function formatCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO')}`
}

function formatNum(n: number): string {
  return n.toLocaleString('es-CO')
}

export function InformesRayoPanel() {
  const { data, loading, error, fetchReport } = useInformesRayo()
  const [preset, setPreset] = useState<PeriodPreset>('thisWeek')
  const [compareMode, setCompareMode] = useState<CompareMode>('previousPeriod')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [zone, setZone] = useState('all')
  const [fetched, setFetched] = useState(false)
  const [analysisText, setAnalysisText] = useState<string | null>(null)

  const { from, to } = useMemo(() => calculatePeriod(preset, customFrom, customTo), [preset, customFrom, customTo])
  const { compareFrom, compareTo } = useMemo(() => calculateComparison(from, to, compareMode), [from, to, compareMode])

  useEffect(() => {
    fetchReport(from, to, zone, compareFrom, compareTo)
    setFetched(true)
  }, [])

  const handleFetch = () => {
    fetchReport(from, to, zone, compareFrom, compareTo)
  }

  // Auto-fetch when period changes (after initial fetch)
  useEffect(() => {
    if (fetched) fetchReport(from, to, zone, compareFrom, compareTo)
  }, [preset, customFrom, customTo, compareMode, zone])

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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-ak-borgona)]/10 flex items-center justify-center">
            <Lightning size={22} weight="fill" className="text-[var(--color-ak-dorado)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Informes Rayo</h2>
            <p className="text-xs text-[var(--text-secondary)]">Reportes rápidos con datos en vivo</p>
          </div>
        </div>
        {data && !loading && (
          <PDFExportButton data={data} from={from} to={to} analysis={analysisText} />
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 space-y-4">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                preset === p.key
                  ? 'bg-[var(--color-ak-borgona)] text-white'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {preset === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setPreset('custom') }}
              className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
            />
            <span className="text-[var(--text-secondary)] text-sm">—</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setPreset('custom') }}
              className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
            />
          </div>
        )}

        {/* Compare toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)]">Comparar:</span>
          <button
            onClick={() => setCompareMode(compareMode === 'previousPeriod' ? 'none' : 'previousPeriod')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              compareMode === 'previousPeriod'
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
            }`}
          >
            {compareMode === 'previousPeriod' ? 'Período anterior ✓' : 'Sin comparación'}
          </button>
          {compLabel && (
            <span className="text-[10px] text-[var(--text-secondary)]">{compLabel}</span>
          )}
        </div>

        {/* Period label */}
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {periodLabel}
        </div>
      </div>

      {/* ── Loading/Error States ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} className="animate-spin text-[var(--color-ak-borgona)]" />
          <span className="ml-3 text-[var(--text-secondary)]">Cargando informe...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <Warning size={20} className="text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {data && !loading && (
        <MetricasClave data={data.kpis} comparison={data.comparison as { kpis: any } | null} />
      )}

      {/* ── Section: Top Products ── */}
      {data && data.topProducts && data.topProducts.length > 0 && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Package size={16} className="text-[var(--color-ak-dorado)]" weight="fill" />
            Top Productos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2 text-[var(--text-secondary)] font-medium">#</th>
                  <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Producto</th>
                  <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Categoría</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Und.</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.slice(0, 15).map((p: any, i: number) => (
                  <tr key={p.product_id || i} className="border-b border-[var(--border-default)]/50">
                    <td className="py-2 text-[var(--text-secondary)]">{i + 1}</td>
                    <td className="py-2 text-[var(--text-primary)] font-medium">{p.product_name}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{p.category_name}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{formatNum(p.quantity)}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{formatCOP(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Zones table ── */}
      {data && data.zones && data.zones.length > 0 && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Funnel size={16} className="text-[var(--color-ak-dorado)]" />
            Por Zona
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Zona</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Ventas</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Cheques</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.zones.map((z: any) => (
                  <tr key={z.zone} className="border-b border-[var(--border-default)]/50">
                    <td className="py-2 text-[var(--text-primary)] font-medium">{z.zone}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{formatCOP(z.total_ventas)}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{z.total_cheques}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">
                      {z.total_cheques > 0 ? formatCOP(Math.round(z.total_ventas / z.total_cheques)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Payments ── */}
      {data && data.payments && data.payments.length > 0 && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <HandCoins size={16} className="text-[var(--color-ak-dorado)]" weight="fill" />
            Métodos de Pago
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Método</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Total</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Cheques</th>
                  <th className="text-right py-2 text-[var(--text-secondary)] font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.payment_method || p.method} className="border-b border-[var(--border-default)]/50">
                    <td className="py-2 text-[var(--text-primary)]">{p.payment_method}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{formatCOP(p.total)}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{p.cheques}</td>
                    <td className="py-2 text-right text-[var(--text-secondary)]">{p.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Junta (Resumen para Acta) ── */}
      {data && data.kpis && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <ClipboardText size={16} className="text-[var(--color-ak-dorado)]" />
            Resumen para Junta
          </h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            {(() => {
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

              const pct = (c: number, p: number) => !p ? '' : ` (${c >= p ? '↑' : '↓'}${Math.abs(((c - p) / p) * 100).toFixed(1)}%)`

              return (
                <ul className="space-y-1.5 pl-3">
                  <li><span className="text-[var(--text-primary)] font-medium">Ventas:</span> {formatCOP(revenue)}{pct(revenue, cRevenue)}</li>
                  <li><span className="text-[var(--text-primary)] font-medium">Cheques:</span> {formatNum(cheques)}{pct(cheques, cCheques)}</li>
                  <li><span className="text-[var(--text-primary)] font-medium">Ticket Promedio:</span> {formatCOP(ticketProm)}</li>
                  {personas > 0 && <li><span className="text-[var(--text-primary)] font-medium">Personas:</span> {formatNum(personas)}{pct(personas, cPersonas)}</li>}
                  {propina > 0 && <li><span className="text-[var(--text-primary)] font-medium">Propina:</span> {formatCOP(propina)}</li>}
                  {propinaPerCapita > 0 && <li><span className="text-[var(--text-primary)] font-medium">Propina/Persona:</span> {formatCOP(propinaPerCapita)}</li>}
                </ul>
              )
            })()}
            <p className="text-[var(--text-secondary)] italic mt-2">
              Copia estos datos para el acta de junta directiva.
            </p>
          </div>
        </div>
      )}

      {/* ── AI Analysis Section ── */}
      {data && !loading && (
        <AnalisisIA data={data} from={from} to={to} onAnalysis={setAnalysisText} />
      )}

      {/* ── Empty state ── */}
      {!data && !loading && !error && fetched && (
        <div className="text-center py-12">
          <Lightning size={40} className="mx-auto text-[var(--text-secondary)] opacity-30" />
          <p className="text-[var(--text-secondary)] mt-3">Selecciona un período para ver el informe</p>
        </div>
      )}
    </div>
  )
}