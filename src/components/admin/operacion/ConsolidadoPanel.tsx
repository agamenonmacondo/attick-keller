'use client'

import { useState, useCallback } from 'react'
import { CaretLeft, CaretRight, Spinner, ArrowCounterClockwise, SunHorizon, CloudSun, Moon, TrendUp, Users, CurrencyDollar, Clock, ShoppingCart, CaretDown, CaretUp } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConsolidadoData, type ConsolidadoData } from '@/lib/hooks/useConsolidadoData'
import { formatDate, getLocalDate, addDays } from '@/lib/utils/formatDate'

const EASE = [0.23, 1, 0.32, 1]
const DIA_NOMBRES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

function formatPesos(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${n.toLocaleString('es-CO')}`
}

function formatMinutos(m: number): string {
  if (m <= 0) return '—'
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h ${min}min`
}

function capacidadColor(pct: number): string {
  if (pct >= 90) return 'var(--color-danger)'
  if (pct >= 70) return 'var(--color-warning)'
  if (pct >= 40) return 'var(--color-ak-dorado)'
  return 'var(--text-muted)'
}

// ── Sub-components ──

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5">
          <div className="h-4 w-32 bg-[var(--bg-input)] rounded mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-[var(--bg-input)] rounded w-full" />
            <div className="h-3 bg-[var(--bg-input)] rounded w-3/4" />
            <div className="h-3 bg-[var(--bg-input)] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ date }: { date: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <ShoppingCart size={48} weight="duotone" className="text-[var(--text-muted)] mb-4" />
      <p className="text-[var(--text-primary)] text-lg font-medium">Sin datos para esta fecha</p>
      <p className="text-[var(--text-secondary)] text-sm mt-1">
        {formatDate(date, 'long')} — posiblemente el restaurante estuvo cerrado
      </p>
    </motion.div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mb-4">
        <span className="text-[var(--color-danger)] text-2xl font-bold">!</span>
      </div>
      <p className="text-[var(--text-primary)] text-lg font-medium">Error al cargar datos</p>
      <p className="text-[var(--text-secondary)] text-sm mt-1 mb-5">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium"
        style={{ transition: 'color 200ms ease-out' }}
      >
        <ArrowCounterClockwise size={16} weight="bold" />
        Reintentar
      </button>
    </motion.div>
  )
}

function DateNavigator({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = getLocalDate()

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        style={{ transition: 'color 200ms, background-color 200ms' }}
        aria-label="Dia anterior"
      >
        <CaretLeft size={20} weight="bold" />
      </button>

      <div className="text-center min-w-[200px]">
        <p className="text-[var(--text-primary)] font-semibold text-base font-['Playfair_Display']">
          {formatDate(date, 'weekday')}
        </p>
        <p className="text-[var(--text-muted)] text-xs">
          {date === today ? 'Hoy' : formatDate(date, 'long')}
        </p>
      </div>

      <button
        onClick={() => {
          const next = addDays(date, 1)
          if (next <= today) onChange(next)
        }}
        disabled={addDays(date, 1) > today}
        className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ transition: 'color 200ms, background-color 200ms' }}
        aria-label="Dia siguiente"
      >
        <CaretRight size={20} weight="bold" />
      </button>
    </div>
  )
}

function CapacityCard({ resumen }: { resumen: ConsolidadoData['resumen'] }) {
  const { totalCheques, capacidadPct, capacidadChequesDia, almuerzoCheques, tardeCheques, cenaCheques, almuerzoCap, tardeCap, cenaCap, capacidadMesas, asientos } = resumen
  const color = capacidadColor(capacidadPct)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendUp size={18} weight="duotone" className="text-[var(--color-ak-dorado)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Capacidad del dia</h3>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold font-['Playfair_Display']" style={{ color }}>{capacidadPct}%</span>
        <span className="text-[var(--text-muted)] text-sm">capacidad utilizada</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full bg-[var(--bg-input)] mb-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(capacidadPct, 100)}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        />
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {totalCheques} de {capacidadChequesDia} cheques posibles &middot; {capacidadMesas} mesas &middot; {asientos} asientos
      </p>

      {/* Service breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Almuerzo', value: almuerzoCheques, cap: almuerzoCap, hours: '12-16h', icon: SunHorizon },
          { label: 'Tarde', value: tardeCheques, cap: tardeCap, hours: '17-19h', icon: CloudSun },
          { label: 'Cena', value: cenaCheques, cap: cenaCap, hours: '20-23h', icon: Moon },
        ].map(s => {
          const pct = s.cap > 0 ? Math.round((s.value / s.cap) * 100) : 0
          const Icon = s.icon
          return (
            <div key={s.label} className="text-center">
              <Icon size={16} weight="regular" className="text-[var(--text-muted)] mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">{s.label} <span className="opacity-60">{s.hours}</span></p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.value}/{s.cap}</p>
              <p className="text-xs" style={{ color: capacidadColor(pct) }}>{pct}%</p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function ServiceTimeCard({ serviceTime, avgServiceTime }: { serviceTime: ConsolidadoData['serviceTime']; avgServiceTime: number }) {
  const maxVal = serviceTime.p90 || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock size={18} weight="duotone" className="text-[var(--color-ak-dorado)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Service Time</h3>
      </div>

      <p className="text-3xl font-bold font-['Playfair_Display'] text-[var(--text-primary)] mb-1">
        {formatMinutos(avgServiceTime)}
      </p>
      <p className="text-xs text-[var(--text-muted)] mb-4">promedio</p>

      {/* Percentile bars */}
      <div className="space-y-2">
        {[
          { label: 'P25', value: serviceTime.p25, color: 'var(--color-success)' },
          { label: 'P50', value: serviceTime.p50, color: 'var(--color-ak-dorado)' },
          { label: 'P75', value: serviceTime.p75, color: 'var(--color-warning)' },
          { label: 'P90', value: serviceTime.p90, color: 'var(--color-danger)' },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-muted)] w-7">{p.label}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: p.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(p.value / maxVal) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)] w-14 text-right">{formatMinutos(p.value)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function HourlyBars({ hourly, type }: { hourly: ConsolidadoData['hourly']; type: 'cheques' | 'revenue' }) {
  if (hourly.length === 0) return null

  const maxVal = type === 'cheques'
    ? Math.max(...hourly.map(h => h.cheques), 1)
    : Math.max(...hourly.map(h => h.revenue), 1)

  const title = type === 'cheques' ? 'Cheques por hora' : 'Revenue por hora'
  const Icon = type === 'cheques' ? ShoppingCart : CurrencyDollar

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
      className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} weight="duotone" className="text-[var(--color-ak-dorado)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{title}</h3>
      </div>

      <div className="space-y-1.5">
        {hourly.map(h => {
          const val = type === 'cheques' ? h.cheques : h.revenue
          const pct = (val / maxVal) * 100
          const display = type === 'cheques' ? `${val}` : formatPesos(val)

          return (
            <div key={h.hora} className="flex items-center gap-3 group">
              <span className="text-xs font-mono text-[var(--text-muted)] w-8 text-right">
                {String(h.hora).padStart(2, '0')}h
              </span>
              <div className="flex-1 h-5 rounded-sm bg-[var(--bg-input)] overflow-hidden relative">
                <motion.div
                  className="h-full rounded-sm"
                  style={{
                    backgroundColor: type === 'cheques' ? 'var(--color-ak-borgona)' : 'var(--color-ak-dorado)',
                    opacity: type === 'cheques' ? 0.75 : 0.65,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 1)}%` }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.05 * (h.hora - 10) }}
                />
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)] w-16 text-right tabular-nums">
                {display}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-[var(--shadow-md)]"
                style={{ transition: 'opacity 150ms' }}
              >
                {h.hora}:00 — {type === 'cheques' ? `${h.cheques} cheques, ${h.personas} pax` : formatPesos(h.revenue)}
                {type === 'cheques' && h.ticket_prom > 0 && ` · ticket prom ${formatPesos(h.ticket_prom)}`}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function TopProductosFranja({ topPorFranja, productos }: { topPorFranja: ConsolidadoData['topPorFranja']; productos: ConsolidadoData['productos'] }) {
  const [toggle, setToggle] = useState<'revenue' | 'cantidad'>('revenue')
  const [expanded, setExpanded] = useState<string | null>(null)

  const FRANJAS = [
    { key: 'almuerzo', label: 'Almuerzo', hours: '12-16h', icon: SunHorizon, color: 'var(--color-warning)' },
    { key: 'tarde', label: 'Tarde', hours: '17-19h', icon: CloudSun, color: 'var(--color-ak-dorado)' },
    { key: 'cena', label: 'Cena', hours: '20-23h', icon: Moon, color: 'var(--color-ak-borgona)' },
  ] as const

  const hasData = FRANJAS.some(f => (topPorFranja[f.key] || []).length > 0)
  if (!hasData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
      className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendUp size={18} weight="duotone" className="text-[var(--color-ak-dorado)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Top productos por franja</h3>
        </div>
        <div className="flex rounded-lg bg-[var(--bg-input)] p-0.5">
          <button
            onClick={() => setToggle('revenue')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md ${toggle === 'revenue' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
            style={{ transition: 'all 150ms' }}
          >
            $
          </button>
          <button
            onClick={() => setToggle('cantidad')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md ${toggle === 'cantidad' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
            style={{ transition: 'all 150ms' }}
          >
            #
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {FRANJAS.map(franja => {
          const prods = topPorFranja[franja.key] || []
          if (prods.length === 0) return null
          const Icon = franja.icon
          const maxVal = toggle === 'revenue'
            ? Math.max(...prods.map(p => p.revenue), 1)
            : Math.max(...prods.map(p => p.cantidad), 1)

          return (
            <div key={franja.key}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} weight="fill" style={{ color: franja.color }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{franja.label}</span>
                <span className="text-[var(--text-muted)] text-xs">{franja.hours}</span>
              </div>

              <div className="space-y-1">
                {prods.map((p, idx) => {
                  const val = toggle === 'revenue' ? p.revenue : p.cantidad
                  const pct = (val / maxVal) * 100
                  const isExpanded = expanded === `${franja.key}-${p.producto}`

                  return (
                    <div key={p.producto}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : `${franja.key}-${p.producto}`)}
                        className="w-full flex items-center gap-2 group py-0.5"
                      >
                        <span className="text-xs font-medium text-[var(--text-muted)] w-4 text-right tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm text-[var(--text-primary)] truncate">{p.producto}</span>
                            <span className="text-xs text-[var(--text-secondary)] ml-2 tabular-nums shrink-0">
                              {toggle === 'revenue' ? formatPesos(p.revenue) : `${p.cantidad}u`}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: franja.color, opacity: 0.5 + (0.5 * (1 - idx / prods.length)) }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, 2)}%` }}
                              transition={{ duration: 0.4, ease: EASE, delay: 0.3 + idx * 0.05 }}
                            />
                          </div>
                        </div>
                        {p.companions.length > 0 && (
                          isExpanded
                            ? <CaretUp size={12} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                            : <CaretDown size={12} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                        )}
                      </button>

                      {/* Companions expand */}
                      <AnimatePresence>
                        {isExpanded && p.companions.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 mt-1 mb-2 flex flex-wrap gap-1.5">
                              {p.companions.map(c => (
                                <span key={c.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-xs text-[var(--text-secondary)]">
                                  +{c.name}
                                  <span className="text-[var(--text-muted)]">x{c.veces}</span>
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function WeeklyComparison({ semana, selectedDate }: { semana: ConsolidadoData['semana']; selectedDate: string }) {
  const maxCheques = Math.max(...semana.map(d => d.cheques), 1)
  const maxRevenue = Math.max(...semana.map(d => d.revenue), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.25 }}
      className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendUp size={18} weight="duotone" className="text-[var(--color-ak-dorado)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Comparativa semanal</h3>
      </div>

      {/* Cheques bars */}
      <div className="space-y-1.5 mb-5">
        <p className="text-xs text-[var(--text-muted)] mb-1">Cheques</p>
        {semana.map(d => {
          const pct = (d.cheques / maxCheques) * 100
          const isSelected = d.date === selectedDate
          return (
            <div key={d.date} className="flex items-center gap-2">
              <span className={`text-xs w-7 text-right tabular-nums ${isSelected ? 'font-bold text-[var(--color-ak-borgona)]' : 'text-[var(--text-muted)]'}`}>
                {DIA_NOMBRES[d.dow]}
              </span>
              <div className="flex-1 h-4 rounded-sm bg-[var(--bg-input)] overflow-hidden">
                <motion.div
                  className="h-full rounded-sm"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-ak-borgona)' : 'var(--color-ak-dorado)',
                    opacity: isSelected ? 0.9 : 0.5,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 2)}%` }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
                />
              </div>
              <span className={`text-xs tabular-nums w-8 text-right ${isSelected ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {d.cheques}
              </span>
              {isSelected && (
                <span className="text-xs text-[var(--color-ak-borgona)] font-medium ml-1">HOY</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Revenue summary row */}
      <div className="flex items-center gap-2 border-t border-[var(--border-default)] pt-3">
        <Users size={14} weight="regular" className="text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-muted)]">Revenue:</span>
        <div className="flex-1 flex gap-1">
          {semana.map(d => {
            const pct = d.revenue > 0 && maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
            const isSelected = d.date === selectedDate
            return (
              <div key={d.date} className="flex-1 relative group">
                <div className="h-8 rounded-sm bg-[var(--bg-input)] overflow-hidden">
                  <motion.div
                    className="w-full rounded-sm"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      backgroundColor: isSelected ? 'var(--color-ak-borgona)' : 'var(--color-ak-dorado)',
                      opacity: isSelected ? 0.9 : 0.5,
                      position: 'absolute',
                      bottom: 0,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 2)}%` }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
                  />
                </div>
                <span className="block text-center text-xs text-[var(--text-muted)] mt-1">
                  {DIA_NOMBRES[d.dow]}
                </span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-7 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-md px-1.5 py-0.5 text-xs text-[var(--text-primary)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-[var(--shadow-md)]"
                  style={{ transition: 'opacity 150ms' }}
                >
                  {formatPesos(d.revenue)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main panel ──

interface ConsolidadoPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function ConsolidadoPanel({ selectedDate, onDateChange }: ConsolidadoPanelProps) {
  const { data, loading, error, refetch } = useConsolidadoData(selectedDate)
  const isEmpty = data && data.hourly.length === 0

  return (
    <div className="max-w-2xl mx-auto">
      <DateNavigator date={selectedDate} onChange={onDateChange} />

      {loading && !data && <Skeleton />}

      {error && !data && <ErrorState message={error} onRetry={refetch} />}

      {isEmpty && <EmptyState date={selectedDate} />}

      {data && !isEmpty && (
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-5 pb-10"
        >
          <CapacityCard resumen={data.resumen} />
          <ServiceTimeCard serviceTime={data.serviceTime} avgServiceTime={data.resumen.avgServiceTime} />
          <HourlyBars hourly={data.hourly} type="cheques" />
          <HourlyBars hourly={data.hourly} type="revenue" />
          <TopProductosFranja topPorFranja={data.topPorFranja} productos={data.productos} />
          <WeeklyComparison semana={data.semana} selectedDate={selectedDate} />

          {/* Footer note */}
          <p className="text-center text-xs text-[var(--text-muted)] pt-2">
            Capacidad teorica: {data.resumen.capacidadMesas} mesas &middot; {data.resumen.asientos} asientos &middot; hasta {data.resumen.capacidadChequesDia} cheques/dia (3 servicios)
          </p>
        </motion.div>
      )}

      {/* Loading overlay when refetching with existing data */}
      {loading && data && (
        <div className="fixed bottom-4 right-4 z-50">
          <Spinner size={20} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      )}
    </div>
  )
}
