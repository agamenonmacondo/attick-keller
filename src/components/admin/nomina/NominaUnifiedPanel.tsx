'use client'

import { useState, useMemo, useEffect } from 'react'
import { useNomina } from '@/lib/hooks/useNomina'
import { NominaContablePanel } from './NominaContablePanel'
import { AnimatedCard } from '../shared/AnimatedCard'
import type { NominaResumen, DailyBreakdown, WeekdayAvg, NominaStaffDetail, NominaStaffPosData } from '@/lib/hooks/useNomina'
import {
  Spinner, ClockCounterClockwise, Users, ArrowLeft, CalendarDots, Sun, Moon,
  ChartBar, Lightning, CaretDown, CaretUp, MagnifyingGlass, Clock, Money,
} from '@phosphor-icons/react'
import { formatCOP } from '@/lib/utils/format'

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
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--color-ak-borgona)] hover:underline">
        <ArrowLeft size={16} /> Volver al resumen
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{staff.nombre_completo}</h3>
          <p className="text-sm text-[var(--text-secondary)]">CC {staff.cedula}{staff.es_medio_tiempo ? ' - Medio tiempo' : ''}</p>
        </div>
        {staff.pos_staff_id && (
          <span className="text-xs px-2 py-1 rounded bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-borgona)]">
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
              <div className="text-lg font-bold text-[var(--color-ak-borgona)]">{formatCOP(posData.totalRevenue)}</div>
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
              <div className="text-lg font-bold text-[var(--color-ak-borgona)]">{formatCOP(posData.productivity)}/h</div>
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
                <tr key={i} className={`border-b border-[var(--border-default)]/50 ${d.es_dominical ? 'bg-[var(--color-ak-borgona)]/5' : ''}`}>
                  <td className="py-1.5 px-1 text-[var(--text-primary)]">
                    {d.fecha.slice(5)} {d.es_dominical && <span className="text-[var(--color-ak-borgona)] text-[10px]">DOM</span>}
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
type UnifiedSubTab = 'operativo' | 'contable'

const SUB_TABS: { key: UnifiedSubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'operativo', label: 'Operativo', icon: <ClockCounterClockwise size={16} weight="regular" /> },
  { key: 'contable', label: 'Contable', icon: <Money size={16} weight="regular" /> },
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
        <button onClick={refetch} className="mt-3 text-xs text-[var(--color-ak-borgona)] hover:underline">Reintentar</button>
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
              className="px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--color-ak-borgona)]"
            />
            <span>a</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--color-ak-borgona)]"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-xs text-[var(--text-secondary)]">Empleados activos</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalEmpleados}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <ClockCounterClockwise size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-xs text-[var(--text-secondary)]">Horas totales</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalHoras}</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <ChartBar size={16} className="text-[var(--color-ak-borgona)]" />
            <span className="text-xs text-[var(--text-secondary)]">Horas ordinarias</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{resumen.totalHorasOrdinarias}h</div>
        </AnimatedCard>
        <AnimatedCard className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightning size={16} className="text-[var(--color-ak-borgona)]" />
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
                  <tr key={d.fecha} className={`border-b border-[var(--border-default)]/50 ${isWeekend ? 'bg-[var(--color-ak-borgona)]/5' : ''} ${isMinDay ? 'bg-[var(--color-danger)]/10' : ''}`}>
                    <td className="py-1.5 px-1 text-[var(--text-primary)]">{d.fecha.slice(5)}</td>
                    <td className="py-1.5 px-1 text-[var(--text-secondary)]">{d.diaSemana}</td>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-3 bg-[var(--bg-secondary)] rounded overflow-hidden">
                          <div className={`h-full rounded bg-[var(--color-ak-borgona)]`} style={{ width: `${barWidth}%`, transition: 'width 0.3s' }} />
                        </div>
                        <span className={`font-medium ${isMinDay ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'}`}>{d.personas}</span>
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
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-[var(--color-ak-borgona)]"></span> Normal</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-[var(--color-danger)]"></span> Menos personal</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-[var(--color-ak-borgona)]/20"></span> Fin de semana</span>
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
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-ak-borgona)]"
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
                  className="border-b border-[var(--border-default)]/50 hover:bg-[var(--color-ak-borgona)]/5 cursor-pointer transition-colors"
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

// ── Main unified component ──
export function NominaUnifiedPanel() {
  const [subTab, setSubTab] = useState<UnifiedSubTab>('operativo')

  return (
    <div className="space-y-5 px-3 sm:px-0">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              subTab === tab.key
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-ak-borgona)]/10'
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
    </div>
  )
}
