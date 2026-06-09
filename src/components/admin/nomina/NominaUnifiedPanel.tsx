'use client'

import { useState, useMemo, useEffect } from 'react'
import { useNomina } from '@/lib/hooks/useNomina'
import { useNominaOpsCosts } from '@/lib/hooks/useNominaOpsCosts'
import { NominaContablePanel } from './NominaContablePanel'
import { AnimatedCard } from '../shared/AnimatedCard'
import type { NominaResumen, DailyBreakdown, WeekdayAvg, NominaStaffDetail, NominaStaffPosData } from '@/lib/hooks/useNomina'
import {
  Spinner, ClockCounterClockwise, Users, ArrowLeft, CalendarDots, Sun, Moon,
  ChartBar, Lightning, CaretDown, CaretUp, MagnifyingGlass, Clock,
  Money, ChartPieSlice, TrendUp, HandCoins, FirstAidKit, Warning, Info,
} from '@phosphor-icons/react'

function formatCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO')}`
}

function formatFull(n: number): string {
  return new Intl.NumberFormat('es-CO').format(Math.round(n))
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(lastDay).padStart(2, '0')}` }
}

const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

const SEDE_LABELS: Record<string, string> = {
  C75: 'Calle 75',
  C85: 'Calle 85',
  KINDER: 'Kinder',
  ADMIN: 'Admin',
}

// ── Shared sub-components duplicated from NominaPanel ──

function HoursBarChart({ resumen }: { resumen: NominaResumen }) {
  const items = [
    { label: 'Ordinarias', mins: resumen.hoMins, color: 'var(--color-ak-borgona)' },
    { label: 'Extra Diurna', mins: resumen.hedMins, color: 'var(--color-ak-crema)' },
    { label: 'Extra Nocturna', mins: resumen.henMins, color: 'var(--color-ak-borgona)' },
    { label: 'Dom. Diurna', mins: resumen.hddMins, color: 'var(--color-ak-ambar)' },
    { label: 'Dom. Nocturna', mins: resumen.hdnMins, color: 'var(--color-danger)' },
    { label: 'Rec. Nocturno', mins: resumen.rnMins, color: 'var(--color-success)' },
  ]
  const total = items.reduce((s, i) => s + i.mins, 0) || 1

  return (
    <div className="space-y-2">
      {items.map(item => {
        const pct = (item.mins / total) * 100
        const hours = (item.mins / 60).toFixed(1)
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] w-28 shrink-0">{item.label}</span>
            <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: item.color, transition: 'width 0.5s ease-out' }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)] w-14 text-right">{hours}h</span>
            <span className="text-xs text-[var(--text-secondary)] w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        )
      })}
    </div>
  )
}

function StaffDetailPanel({
  staff,
  totals,
  daily,
  byWeekDay,
  posData,
  onBack,
}: {
  staff: { id: string; cedula: string; nombre_completo: string; pos_staff_id: string | null; es_medio_tiempo: boolean }
  totals: Record<string, any>
  daily: NominaStaffDetail[]
  byWeekDay: Record<string, { count: number; hoMins: number; totalMins: number }>
  posData: NominaStaffPosData | null
  onBack: () => void
}) {
  const [sortField, setSortField] = useState<'fecha' | 'total_horas'>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedDaily = useMemo(() => {
    return [...daily].sort((a, b) => {
      if (sortField === 'fecha') return sortDir === 'desc' ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)
      return 0
    })
  }, [daily, sortField, sortDir])

  const weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
  const weekDayData = weekDays
    .filter(d => byWeekDay[d])
    .map(d => ({ day: d, ...byWeekDay[d] }))

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] hover:underline">
        <ArrowLeft size={16} /> Volver al resumen
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{staff.nombre_completo}</h3>
          <p className="text-sm text-[var(--text-secondary)]">CC {staff.cedula}{staff.es_medio_tiempo ? ' - Medio tiempo' : ''}</p>
        </div>
        {staff.pos_staff_id && (
          <span className="text-xs px-2 py-1 rounded bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]/15 dark:text-[var(--color-ak-borgona-light)]">
            Mesero POS #{staff.pos_staff_id}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatedCard className="p-3">
          <div className="text-xs text-[var(--text-secondary)]">Dias trabajados</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{totals.diasTrabajados}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="text-xs text-[var(--text-secondary)]">Total horas</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{totals.totalHoras}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="text-xs text-[var(--text-secondary)]">Horas extras</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{totals.horasExtras}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="text-xs text-[var(--text-secondary)]">Domingales</div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{totals.dominicales}</div>
        </AnimatedCard>
      </div>

      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Desglose de horas</h4>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'HO', val: totals.ho, hrs: totals.hoHours, color: 'var(--color-ak-borgona)' },
            { label: 'HED', val: totals.hed, hrs: totals.hedHours, color: 'var(--color-ak-crema)' },
            { label: 'HEN', val: totals.hen, hrs: totals.henHours, color: 'var(--color-ak-borgona)' },
            { label: 'HDD', val: totals.hdd, color: 'var(--color-ak-ambar)' },
            { label: 'HDN', val: totals.hdn, color: 'var(--color-danger)' },
            { label: 'RN', val: totals.rn, color: 'var(--color-success)' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="text-xs text-[var(--text-secondary)]">{item.label}</div>
              <div className="text-base font-bold" style={{ color: item.color }}>{item.val}</div>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {posData && (
        <AnimatedCard className="p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Ventas como mesero</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Revenue</div>
              <div className="text-lg font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatCOP(posData.totalRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Propinas</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{formatCOP(posData.totalPropina)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Cheques</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{posData.totalCheques}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)]">Productividad</div>
              <div className="text-lg font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatCOP(posData.productivity)}/h</div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {weekDayData.length > 0 && (
        <AnimatedCard className="p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Por dia de la semana</h4>
          <div className="space-y-1">
            {weekDayData.map(wd => {
              const avgHours = (wd.totalMins / 60 / wd.count).toFixed(1)
              return (
                <div key={wd.day} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-[var(--text-secondary)]">{wd.day}</span>
                  <span className="w-8 font-medium text-[var(--text-primary)]">{wd.count}d</span>
                  <span className="text-[var(--text-secondary)]">prom {avgHours}h</span>
                </div>
              )
            })}
          </div>
        </AnimatedCard>
      )}

      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Registro diario</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-1 text-[var(--text-secondary)] cursor-pointer" onClick={() => { if (sortField === 'fecha') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField('fecha'); setSortDir('desc') } }}>
                  Fecha {sortField === 'fecha' && (sortDir === 'desc' ? <CaretDown size={10} /> : <CaretUp size={10} />)}
                </th>
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Entrada</th>
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Salida</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Total</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HO</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HED</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HEN</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HDD</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HDN</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">RN</th>
              </tr>
            </thead>
            <tbody>
              {sortedDaily.map((d, i) => (
                <tr key={i} className={`border-b border-[var(--border-default)]/50 ${d.es_dominical ? 'bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/5' : ''}`}>
                  <td className="py-1.5 px-1 text-[var(--text-primary)]">
                    {d.fecha.slice(5)} {d.es_dominical && <span className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] text-[10px]">DOM</span>}
                  </td>
                  <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.hora_entrada || '-'}</td>
                  <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.hora_salida || '-'}</td>
                  <td className="py-1.5 px-1 text-right font-medium text-[var(--text-primary)]">{d.total_horas}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.ho}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.hed}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.hen}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.hdd}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.hdn}</td>
                  <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.rn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedCard>
    </div>
  )
}

// ── Sub-tab type ──
type UnifiedSubTab = 'operativo' | 'contable' | 'costos'

const SUB_TABS: { key: UnifiedSubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'operativo', label: 'Operativo', icon: <ClockCounterClockwise size={16} weight="regular" /> },
  { key: 'contable', label: 'Contable', icon: <Money size={16} weight="regular" /> },
  { key: 'costos', label: 'Costos vs Ventas', icon: <ChartPieSlice size={16} weight="regular" /> },
]

// ── Operativo tab ──
function OperativoTab() {
  const [initialized, setInitialized] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, loading, error, refetch, selectedStaffId, staffDetail, detailLoading, detailError, fetchStaffDetail, closeDetail } = useNomina(
    initialized ? from : undefined,
    initialized ? to : undefined
  )
  const [search, setSearch] = useState('')

  // On mount: fetch available periodos and default to most recent
  useEffect(() => {
    if (!initialized && data?.periodosDisponibles?.length) {
      const mostRecent = data.periodosDisponibles[0]
      if (mostRecent?.fecha_inicio && mostRecent?.fecha_fin) {
        setFrom(mostRecent.fecha_inicio.slice(0, 10))
        setTo(mostRecent.fecha_fin.slice(0, 10))
        setInitialized(true)
      }
    }
  }, [data?.periodosDisponibles, initialized])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <button onClick={refetch} className="mt-3 text-xs text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)] hover:underline">Reintentar</button>
      </div>
    )
  }

  if (!data) return null

  if (selectedStaffId && staffDetail) {
    return (
      <StaffDetailPanel
        staff={staffDetail.staff}
        totals={staffDetail.totals}
        daily={staffDetail.daily}
        byWeekDay={staffDetail.byWeekDay}
        posData={staffDetail.posData}
        onBack={closeDetail}
      />
    )
  }

  const { resumen, staff } = data
  const filteredStaff = search
    ? staff.filter(s => s.nombre_completo.toLowerCase().includes(search.toLowerCase()) || s.cedula.includes(search))
    : staff

  // Format period label
  const fromDate = new Date(from + 'T00:00:00')
  const monthLabel = MONTHS[fromDate.getMonth()]
  const yearLabel = fromDate.getFullYear()

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Nomina Operativa</h2>
          <p className="text-sm text-[var(--text-secondary)]">{monthLabel} {yearLabel} - Biometrico</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <CalendarDots size={14} />
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/20 bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--color-ak-borgona)] dark:focus:border-[var(--color-ak-borgona-light)]"
            />
            <span>a</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/20 bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--color-ak-borgona)] dark:focus:border-[var(--color-ak-borgona-light)]"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
            <span className="text-xs text-[var(--text-secondary)]">Empleados activos</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalEmpleados}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <ClockCounterClockwise size={16} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
            <span className="text-xs text-[var(--text-secondary)]">Horas totales</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalHoras}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <ChartBar size={16} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
            <span className="text-xs text-[var(--text-secondary)]">Horas ordinarias</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalHorasOrdinarias}h</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightning size={16} className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
            <span className="text-xs text-[var(--text-secondary)]">% Extras</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.pctExtras}%</div>
        </AnimatedCard>
      </div>

      {/* Hours distribution + Extra KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatedCard className="p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Distribucion de horas</h4>
          <HoursBarChart resumen={resumen} />
        </AnimatedCard>
        <div className="space-y-3">
          <AnimatedCard className="p-4">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Resumen del periodo</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Dias trabajados (registros)</span>
                <span className="font-medium text-[var(--text-primary)]">{resumen.totalDiasRegistros}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Horas extras (cantidad)</span>
                <span className="font-medium text-[var(--text-primary)]">{resumen.totalHorasExtrasCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Horas dominicales</span>
                <span className="font-medium text-[var(--text-primary)]">{resumen.totalHorasDominicales}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Recargo nocturno</span>
                <span className="font-medium text-[var(--text-primary)]">{resumen.totalRecargoNocturno}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Promedio turno</span>
                <span className="font-medium text-[var(--text-primary)]">{resumen.promedioTurno}</span>
              </div>
            </div>
          </AnimatedCard>
          <AnimatedCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sun size={16} className="text-[var(--color-ak-ambar)]" />
              <span className="text-xs text-[var(--text-secondary)]">Dominicales diurnos</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">{resumen.totalHorasDominicales}h</div>
            <div className="flex items-center gap-2 mt-2">
              <Moon size={16} className="text-[var(--color-ak-borgona)]" />
              <span className="text-xs text-[var(--text-secondary)]">Extra nocturnos</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">{resumen.totalHorasExtras}h</div>
          </AnimatedCard>
        </div>
      </div>

      {/* Personal por dia */}
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Personal por dia</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-1.5 px-1 text-[var(--text-secondary)]">Fecha</th>
                <th className="text-left py-1.5 px-1 text-[var(--text-secondary)]">Dia</th>
                <th className="text-right py-1.5 px-1 text-[var(--text-secondary)]">Personas</th>
                <th className="text-right py-1.5 px-1 text-[var(--text-secondary)]">Horas total</th>
                <th className="text-right py-1.5 px-1 text-[var(--text-secondary)]">Prom/persona</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyBreakdown?.map((d: DailyBreakdown) => {
                const isWeekend = d.diaSemana === 'Dom' || d.diaSemana === 'Sab'
                const maxPersons = Math.max(...(data.dailyBreakdown?.map((x: DailyBreakdown) => x.personas) || [1]))
                const barWidth = maxPersons > 0 ? (d.personas / maxPersons) * 100 : 0
                const minPersons = Math.min(...(data.dailyBreakdown?.map((x: DailyBreakdown) => x.personas) || [1]))
                const isMinDay = d.personas === minPersons && minPersons !== maxPersons
                return (
                  <tr key={d.fecha} className={`border-b border-[var(--border-default)]/50 ${isWeekend ? 'bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/5' : ''} ${isMinDay ? 'bg-red-500/10' : ''}`}>
                    <td className="py-1.5 px-1 text-[var(--text-primary)]">{d.fecha.slice(5)}</td>
                    <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.diaSemana}</td>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-3 bg-[var(--bg-secondary)] rounded overflow-hidden">
                          <div className={`h-full rounded bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]`} style={{ width: `${barWidth}%`, transition: 'width 0.3s' }} />
                        </div>
                        <span className={`font-medium ${isMinDay ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{d.personas}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.horasTotal}h</td>
                    <td className="py-1.5 px-1 text-right text-[var(--text-secondary)]">{d.horasPromedio}h</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data.dailyBreakdown && data.dailyBreakdown.length > 0 && (
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]"></span> Normal</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-red-500"></span> Menos personal</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-[var(--color-ak-borgona)]/20 dark:bg-[var(--color-ak-borgona-light)]/20"></span> Fin de semana</span>
          </div>
        )}
      </AnimatedCard>

      {/* Promedio por dia de la semana */}
      <AnimatedCard className="p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Promedio por dia de la semana</h4>
        <div className="space-y-2">
          {data.weekdayAvg?.map((w: WeekdayAvg) => {
            const maxP = Math.max(...(data.weekdayAvg?.map((x: WeekdayAvg) => x.avgPersonas) || [1]))
            const barP = maxP > 0 ? (w.avgPersonas / maxP) * 100 : 0
            const minP = Math.min(...(data.weekdayAvg?.map((x: WeekdayAvg) => x.avgPersonas) || [1]))
            const isMin = w.avgPersonas === minP
            return (
              <div key={w.dia} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] w-8 shrink-0">{w.dia}</span>
                <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded overflow-hidden">
                  <div
                    className="h-full rounded flex items-center pl-1.5 text-[10px] font-medium text-white"
                    style={{ width: `${Math.max(barP, 12)}%`, backgroundColor: isMin ? 'var(--color-danger)' : 'var(--color-ak-borgona)', transition: 'width 0.5s' }}
                  >
                    {w.avgPersonas}
                  </div>
                </div>
                <span className="text-xs text-[var(--text-secondary)] w-20 text-right">{w.avgHoras}h prom</span>
                <span className="text-[10px] text-[var(--text-secondary)]">({w.count}d)</span>
              </div>
            )
          })}
        </div>
      </AnimatedCard>

      {/* Staff table */}
      <AnimatedCard className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Operarios</h4>
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o cedula..."
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/20 bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-ak-borgona)] dark:focus:border-[var(--color-ak-borgona-light)]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-1 text-[var(--text-secondary)]">Nombre</th>
                <th className="text-center py-2 px-1 text-[var(--text-secondary)]">Dias</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HO</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">Total</th>
                <th className="text-center py-2 px-1 text-[var(--text-secondary)]">Extras</th>
                <th className="text-center py-2 px-1 text-[var(--text-secondary)]">Dom.</th>
                <th className="text-right py-2 px-1 text-[var(--text-secondary)]">HO/h</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(s => (
                <tr
                  key={s.id}
                  onClick={() => fetchStaffDetail(s.id)}
                  className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5 dark:hover:bg-[var(--color-ak-borgona-light)]/5 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-1">
                    <div className="font-medium text-[var(--text-primary)]">{s.nombre_completo}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">CC {s.cedula}{s.pos_staff_id ? ` - POS #${s.pos_staff_id}` : ''}</div>
                  </td>
                  <td className="py-2 px-1 text-center text-[var(--text-primary)]">{s.dias_trabajados}</td>
                  <td className="py-2 px-1 text-right text-[var(--text-secondary)]">{s.ho}</td>
                  <td className="py-2 px-1 text-right font-medium text-[var(--text-primary)]">{s.total_horas}</td>
                  <td className="py-2 px-1 text-center text-[var(--text-secondary)]">{s.horas_extras}</td>
                  <td className="py-2 px-1 text-center text-[var(--text-secondary)]">{s.dominicales}</td>
                  <td className="py-2 px-1 text-right text-[var(--text-secondary)]">{s.hoHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStaff.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">No se encontraron operarios</div>
        )}
      </AnimatedCard>
    </div>
  )
}

// ── Costos vs Ventas tab ──
function PercentBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full h-2 rounded-full bg-[var(--bg-card-hover)] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function RatioGauge({ label, pct, value, sub, warn = false }: { label: string; pct: number; value: string; sub?: string; warn?: boolean }) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (pct / 100) * circumference
  const color = warn ? (pct > 35 ? 'var(--color-danger)' : pct > 25 ? 'var(--color-ak-borgona-light)' : 'var(--color-success, #10b981)') : 'var(--color-ak-borgona-light)'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg-card-hover)" strokeWidth="8" />
          <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[var(--text-primary)]">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5 text-center">{label}</p>
      <p className="text-[10px] text-[var(--text-secondary)] text-center">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-secondary)] text-center">{sub}</p>}
    </div>
  )
}

function KPIBox({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span className="opacity-70">{icon}</span>}
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] opacity-80">{label}</p>
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  )
}

function CostosTab() {
  const now = new Date()
  const [periodoMonth, setPeriodoMonth] = useState(now.getMonth()) // 0-indexed
  const [periodoYear, setPeriodoYear] = useState(now.getFullYear())
  const [sede, setSede] = useState('C75')

  const periodoStr = `${MONTHS[periodoMonth]} ${periodoYear}`
  const { data, loading, error } = useNominaOpsCosts(periodoStr, sede)

  const sedes = ['C75', 'C85', 'KINDER', 'ADMIN']

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Spinner size={28} className="animate-spin text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error || 'Sin datos de nomina'}</p>
      </div>
    )
  }

  const { resumen, composicion, provisiones, novedades, propinas, heRecargos, empleados, ventas, ratios } = data

  return (
    <div className="space-y-5">
      {/* Header + selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Costos Nomina</h2>
          <p className="text-sm text-[var(--text-secondary)]">{periodoStr} · {SEDE_LABELS[sede] || sede}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Period selector */}
          <div className="flex rounded-md overflow-hidden border border-[var(--border-default)]">
            <select
              value={periodoMonth}
              onChange={e => setPeriodoMonth(Number(e.target.value))}
              className="px-2 py-1.5 text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={periodoYear}
              onChange={e => setPeriodoYear(Number(e.target.value))}
              className="px-2 py-1.5 text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none border-l border-[var(--border-default)]"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {/* Sede selector */}
          <div className="flex rounded-md overflow-hidden border border-[var(--border-default)]">
            {sedes.map(s => (
              <button
                key={s}
                onClick={() => setSede(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sede === s
                    ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
                    : 'bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10 text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10 dark:hover:bg-[var(--color-ak-borgona-light)]/10'
                }`}
              >
                {SEDE_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employee count badge */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-ak-borgona)]/10 text-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]/10 dark:text-[var(--color-ak-borgona-light)]">
          <Users size={14} weight="fill" />
          <span className="text-xs font-semibold">{empleados} empleados</span>
        </div>
      </div>

      {/* Ratios Nomina/Ventas */}
      {ventas.revenue > 0 && (
        <AnimatedCard delay={0} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--color-ak-borgona)]/20 dark:border-[var(--color-ak-borgona-light)]/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendUp size={18} weight="fill" className="text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Nomina vs Ventas</h4>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ratios.nominaDevenidoVsRevenue !== null && (
              <RatioGauge
                label="Devengado / Ventas"
                pct={ratios.nominaDevenidoVsRevenue}
                value={formatFull(resumen.totalDevengado)}
                sub={`de ${formatFull(ventas.revenue)}`}
                warn
              />
            )}
            {ratios.costoRealVsRevenue !== null && (
              <RatioGauge
                label="Costo Real / Ventas"
                pct={ratios.costoRealVsRevenue}
                value={formatFull(resumen.costoReal)}
                sub={`(+${((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% prov.)`}
                warn
              />
            )}
            {ratios.salarioVsRevenue !== null && (
              <RatioGauge
                label="Salario / Ventas"
                pct={ratios.salarioVsRevenue}
                value={formatFull(composicion.salarioDevengado)}
                warn
              />
            )}
            {ratios.propinasVsRevenue !== null && (
              <RatioGauge
                label="Propinas / Ventas"
                pct={ratios.propinasVsRevenue}
                value={formatFull(composicion.propinas)}
              />
            )}
            {ratios.margenBruto !== null && (
              <RatioGauge
                label="Margen Bruto"
                pct={ratios.margenBruto}
                value={`${ratios.margenBruto.toFixed(1)}%`}
                sub="Ventas - Costo real"
                warn
              />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-default)] grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Ventas del periodo</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{formatFull(ventas.revenue)}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{ventas.transactions} transacciones</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Costo Nomina Real</p>
              <p className="text-sm font-bold text-orange-500">{formatFull(resumen.costoReal)}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">devengado + provisiones</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">Margen</p>
              <p className={`text-sm font-bold ${ratios.margenBruto && ratios.margenBruto < 0 ? 'text-[var(--color-danger)]' : 'text-emerald-500'}`}>
                {ratios.margenBruto !== null ? `${formatFull(ventas.revenue - resumen.costoReal)}` : '—'}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">{ratios.margenBruto !== null ? `${ratios.margenBruto.toFixed(1)}% margen` : ''}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase mb-2">De cada COP 100 en ventas:</p>
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {ratios.salarioVsRevenue !== null && (
                <div className="bg-[var(--color-ak-borgona)] flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.salarioVsRevenue}%` }}>
                  Salario {ratios.salarioVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.propinasVsRevenue !== null && (
                <div className="bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.propinasVsRevenue}%` }}>
                  Prop {ratios.propinasVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.provisionesVsRevenue !== null && ratios.provisionesVsRevenue > 1 && (
                <div className="bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.provisionesVsRevenue}%` }}>
                  Prov {ratios.provisionesVsRevenue.toFixed(0)}
                </div>
              )}
              {ratios.margenBruto !== null && ratios.margenBruto > 0 && (
                <div className="bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${ratios.margenBruto}%` }}>
                  Margen {ratios.margenBruto.toFixed(0)}
                </div>
              )}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIBox
          label="Devengado"
          value={formatCOP(resumen.totalDevengado)}
          sub={formatFull(resumen.totalDevengado)}
          color="bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/5"
          icon={<Money size={14} />}
        />
        <KPIBox
          label="Costo Real"
          value={formatCOP(resumen.costoReal)}
          sub={`+${((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% provisiones`}
          color="bg-orange-500/5"
        />
        <KPIBox
          label="Neto a Pagar"
          value={formatCOP(resumen.totalNeto)}
          sub={formatFull(resumen.totalNeto)}
          color="bg-emerald-500/5"
        />
        <KPIBox
          label="Costo/Empleado"
          value={formatCOP(resumen.costoPorEmpleado)}
          sub={`Neto: ${formatCOP(resumen.netoPorEmpleado)}`}
          color="bg-blue-500/5"
        />
      </div>

      {/* Composicion del devengado */}
      <AnimatedCard delay={0.05} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Composicion del Devengado</h4>
        <div className="space-y-2.5">
          {[
            { label: 'Salario', value: composicion.salarioDevengado, color: 'bg-[var(--color-ak-borgona)]' },
            { label: 'Propinas', value: composicion.propinas, color: 'bg-amber-500' },
            { label: 'Recargos HE/RN/RD', value: composicion.recargosHERN, color: 'bg-blue-500' },
            { label: 'Aux. Transporte', value: composicion.auxilioTransporte, color: 'bg-emerald-500' },
            { label: 'Aux. No Salarial', value: composicion.auxilioNoSalarial, color: 'bg-purple-500' },
          ].map(item => {
            const pct = resumen.totalDevengado > 0 ? (item.value / resumen.totalDevengado) * 100 : 0
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatFull(item.value)} <span className="text-[var(--text-secondary)]">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <PercentBar value={item.value} max={resumen.totalDevengado} color={item.color} />
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-2 border-t border-[var(--border-default)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Total Devengado</span>
          <span className="text-sm font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatFull(resumen.totalDevengado)}</span>
        </div>
      </AnimatedCard>

      {/* 2 columnas: Provisiones + Deducciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={0.10} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Provisiones Empleador</h4>
          <div className="space-y-2">
            {[
              { label: 'Salud (8.5%)', value: provisiones.saludEmpleador },
              { label: 'Pension (12%)', value: provisiones.pensionEmpleador },
              { label: 'ARL', value: provisiones.arlEmpleador },
              { label: 'Caja Compensacion', value: provisiones.cajaEmpleador },
              { label: 'Cesantias', value: provisiones.cesantiasEmpleador },
              { label: 'Prima', value: provisiones.primaEmpleador },
              { label: 'Vacaciones', value: provisiones.vacacionesEmpleador },
            ].map(item => {
              const pct = provisiones.total > 0 ? (item.value / provisiones.total) * 100 : 0
              return (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatFull(item.value)} <span className="text-[var(--text-secondary)]">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
              )
            })}
            <div className="pt-2 mt-1 border-t border-[var(--border-default)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Total Provisiones</span>
              <span className="text-sm font-bold text-orange-500">{formatFull(provisiones.total)}</span>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.15} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Deducciones Empleado</h4>
          <div className="space-y-2">
            {[
              { label: 'Salud (4%)', value: data.deducciones.saludEmpleado },
              { label: 'Pension (4%)', value: data.deducciones.pensionEmpleado },
              { label: 'Pagos Realizados', value: data.deducciones.pagosRealizados },
              { label: 'Prestamos/Consumos', value: data.deducciones.prestamosConsumos },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <span className="font-medium text-[var(--text-primary)]">{formatFull(item.value)}</span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-[var(--border-default)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Total Deducciones</span>
              <span className="text-sm font-bold text-red-400">{formatFull(resumen.totalDeducciones)}</span>
            </div>
          </div>

          {propinas && (
            <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Propinas</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Ventas periodo</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatFull(propinas.totalVentas)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Valor dia/persona</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatFull(propinas.valorDiaPropina)}</span>
                </div>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* HE/Recargos + Novedades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard delay={0.20} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Horas Extra y Recargos</h4>
          <p className="text-2xl font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatFull(heRecargos.total)}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {heRecargos.count} empleados con HE/recargos
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-[var(--bg-card-hover)] p-2 text-center">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">% del devengado</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {resumen.totalDevengado > 0 ? ((heRecargos.total / resumen.totalDevengado) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-[var(--bg-card-hover)] p-2 text-center">
              <p className="text-[10px] text-[var(--text-secondary)] uppercase">HE/persona</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {empleados > 0 ? formatCOP(heRecargos.total / empleados) : '$0'}
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.25} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15 p-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Novedades del Mes</h4>
          <p className="text-2xl font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{novedades.total}</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">incidencias registradas</p>
          {novedades.detail && novedades.detail.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {novedades.detail.slice(0, 8).map((n: any, i: number) => (
                <div key={i} className="flex items-start justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--text-primary)] truncate">{n.empleado}</span>
                    <span className="text-[var(--text-secondary)] ml-1">· {n.tipo}</span>
                  </div>
                  {n.dias && (
                    <span className="shrink-0 text-[var(--text-secondary)]">{n.dias}d</span>
                  )}
                </div>
              ))}
              {novedades.detail.length > 8 && (
                <p className="text-[10px] text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">
                  +{novedades.detail.length - 8} mas
                </p>
              )}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Costo real desglosado */}
      <AnimatedCard delay={0.30} className="bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10 rounded-xl border border-[var(--color-ak-borgona)]/20 dark:border-[var(--color-ak-borgona-light)]/20 p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Resumen Costo Real Empleador</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/10 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">Devengado</p>
            <p className="text-lg font-bold text-[var(--color-ak-borgona)] dark:text-[var(--color-ak-borgona-light)]">{formatCOP(resumen.totalDevengado)}</p>
          </div>
          <div className="rounded-lg bg-orange-500/5 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">+ Provisiones</p>
            <p className="text-lg font-bold text-orange-500">{formatCOP(resumen.totalProvisiones)}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/5 p-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">= Costo Real</p>
            <p className="text-lg font-bold text-emerald-500">{formatCOP(resumen.costoReal)}</p>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2">
          Las provisiones representan el {((resumen.totalProvisiones / resumen.totalDevengado) * 100).toFixed(0)}% adicional sobre el devengado
        </p>
      </AnimatedCard>
    </div>
  )
}

// ── Main unified component ──
export function NominaUnifiedPanel() {
  const [subTab, setSubTab] = useState<UnifiedSubTab>('operativo')

  return (
    <div className="space-y-5 px-3 sm:px-0">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              subTab === tab.key
                ? 'bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] text-white'
                : 'bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10 text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10 dark:hover:bg-[var(--color-ak-borgona-light)]/10'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {subTab === 'operativo' && <OperativoTab />}
      {subTab === 'contable' && <NominaContablePanel />}
      {subTab === 'costos' && <CostosTab />}
    </div>
  )
}
