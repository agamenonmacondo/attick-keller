'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import Link from 'next/link'
import {
  ClockAfternoon,
  ClockClockwise,
  SignOut,
  House,
  WarningCircle,
  MapPin,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  Timer,
  Megaphone,
} from '@phosphor-icons/react'
import { DAY_NAMES } from '@/lib/types/shifts'
import { getWeekStr, getWeekDates } from '@/lib/utils/costCalculator'
import CheckInOut from '@/components/admin/shifts/CheckInOut'
import ContingencyReport from '@/components/admin/shifts/ContingencyReport'

interface ShiftType {
  code: string
  name: string
  entrada: string
  salida: string
  ordinarias: number
  nocturnas: number
}

interface Assignment {
  id: string
  day_index: number
  shift_code: string
  estimated_hours: number | null
  estimated_cost: number | null
  checkin_at: string | null
  checkout_at: string | null
  novedad?: string
}

interface DailyHour {
  date: string
  checkin: string | null
  checkout: string | null
  hours: number
  type?: string
  description?: string
}

type Tab = 'horario' | 'checkin' | 'novedad' | 'horas'

export default function MiTurnoPage() {
  const { user, signOut, roleLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('horario')
  const [weekStr, setWeekStr] = useState(() => getWeekStr(new Date()))
  const [employee, setEmployee] = useState<{ nombre_completo: string; alias: string; cargo: string; area: string } | null>(null)
  const [schedule, setSchedule] = useState<{ id: string; week_str: string; status: string } | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [loading, setLoading] = useState(true)

  // Horas trabajadas
  const [totalWorkedHours, setTotalWorkedHours] = useState(0)
  const [dailyHours, setDailyHours] = useState<DailyHour[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/shift-my-week?week_str=${weekStr}`)
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      setEmployee(data.employee)
      setSchedule(data.schedule)
      setAssignments(data.assignments || [])

      if (data.employee?.area) {
        const stRes = await fetch(`/api/admin/shift-schedules?area=${data.employee.area}&week_str=${weekStr}`)
        if (stRes.ok) {
          const stData = await stRes.json()
          setShiftTypes(stData.shift_types || [])
        }
      }

      // Fetch hours
      const hoursRes = await fetch(`/api/admin/shift-my-hours?week_str=${weekStr}`)
      if (hoursRes.ok) {
        const hoursData = await hoursRes.json()
        setTotalWorkedHours(hoursData.total_worked_hours || 0)
        setDailyHours(hoursData.daily || [])
      }
    } catch (err) {
      console.error('Error loading shift data:', err)
    } finally {
      setLoading(false)
    }
  }, [weekStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const goToPrevWeek = () => {
    const [y, w] = weekStr.split('-W').map(Number)
    if (w === 1) {
      setWeekStr(`${y - 1}-W52`)
    } else {
      setWeekStr(`${y}-W${String(w - 1).padStart(2, '0')}`)
    }
  }
  const goToNextWeek = () => {
    const [y, w] = weekStr.split('-W').map(Number)
    if (w === 52) {
      setWeekStr(`${y + 1}-W01`)
    } else {
      setWeekStr(`${y}-W${String(w + 1).padStart(2, '0')}`)
    }
  }

  if (roleLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Debes iniciar sesion</p>
      </div>
    )
  }

  const weekDates = getWeekDates(weekStr)
  const assignmentMap = new Map(assignments.map(a => [a.day_index, a]))

  // Find today's assignment for check-in/out
  const today = new Date().getDay() // 0=Sun, 1=Mon, ...
  const todayAssignment = assignmentMap.get(today)
  const todayShiftType = todayAssignment
    ? shiftTypes.find(t => t.code === todayAssignment.shift_code)
    : null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'horario', label: 'Mi Horario', icon: <CalendarDots size={18} /> },
    { key: 'checkin', label: 'Check In/Out', icon: <MapPin size={18} /> },
    { key: 'novedad', label: 'Novedad', icon: <Megaphone size={18} /> },
    { key: 'horas', label: 'Mis Horas', icon: <Timer size={18} /> },
  ]

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-default)]/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--color-ak-madera)] transition-colors"
          >
            <House size={18} weight="fill" />
          </Link>
          <span className="font-['Playfair_Display'] text-base font-bold text-[var(--color-ak-madera)]">
            Mi Turno
          </span>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--color-ak-madera)] transition-colors"
          >
            <SignOut size={18} />
          </button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Employee info */}
        {employee && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60 p-4 mb-4">
            <div className="font-semibold text-[var(--text-primary)]">{employee.alias}</div>
            <div className="text-sm text-[var(--text-secondary)]">{employee.cargo} — {employee.area}</div>
          </div>
        )}

        {/* Week navigator */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={goToPrevWeek} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)]">
            <ArrowLeft size={18} />
          </button>
          <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{weekStr}</span>
          <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)]">
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-default)]/60">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'bg-[var(--color-ak-borgona)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-[var(--text-secondary)] text-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando...
          </div>
        )}

        {!loading && activeTab === 'horario' && (
          <div className="space-y-2">
            {!schedule ? (
              <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)]">
                <ClockAfternoon size={48} className="mx-auto mb-3 opacity-30" weight="duotone" />
                <p>No hay cronograma publicado para la semana {weekStr}</p>
                <p className="text-sm mt-1">Contacta a tu lider de area</p>
              </div>
            ) : (
              DAY_NAMES.map((day, i) => {
                const assignment = assignmentMap.get(i)
                const st = assignment ? shiftTypes.find(t => t.code === assignment.shift_code) : null
                const date = weekDates[i]
                const isToday = date && new Date().toDateString() === date.toDateString()
                const hasNovedad = assignment?.novedad

                return (
                  <div
                    key={i}
                    className={`bg-[var(--bg-card)] rounded-lg p-3 flex items-center justify-between
                      ${isToday ? 'ring-2 ring-[var(--color-ak-borgona)]/50' : ''}
                      ${!assignment ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 text-center">
                        <div className="text-xs text-[var(--text-secondary)]">{day}</div>
                        {date && (
                          <div className="text-sm font-mono font-medium text-[var(--text-primary)]">
                            {date.getDate()}/{date.getMonth() + 1}
                          </div>
                        )}
                      </div>

                      {assignment && st ? (
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">
                            {st.code} — {st.name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {st.entrada} - {st.salida} ({st.ordinarias + st.nocturnas}h)
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--text-secondary)]">Descanso</div>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="text-xs text-[var(--text-secondary)] flex flex-col items-end gap-0.5">
                      {hasNovedad && (
                        <span className="text-amber-400 font-medium">{assignment!.novedad}</span>
                      )}
                      {assignment?.checkin_at && (
                        <span className="text-emerald-400">
                          IN {new Date(assignment.checkin_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {assignment?.checkout_at && (
                        <span className="text-blue-400">
                          OUT {new Date(assignment.checkout_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {!loading && activeTab === 'checkin' && (
          <div className="space-y-4">
            {!schedule ? (
              <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center text-[var(--text-secondary)]">
                <MapPin size={36} className="mx-auto mb-2 opacity-30" />
                <p>No hay cronograma publicado para esta semana</p>
              </div>
            ) : !todayAssignment ? (
              <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center text-[var(--text-secondary)]">
                <ClockClockwise size={36} className="mx-auto mb-2 opacity-30" />
                <p>No tienes turno asignado hoy</p>
              </div>
            ) : (
              <>
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60 p-4">
                  <div className="text-sm text-[var(--text-secondary)] mb-1">Turno de hoy</div>
                  {todayShiftType ? (
                    <div className="font-medium text-[var(--text-primary)]">
                      {todayShiftType.code} — {todayShiftType.name}
                    </div>
                  ) : (
                    <div className="font-medium text-[var(--text-primary)]">
                      {todayAssignment.shift_code}
                    </div>
                  )}
                  {todayShiftType && (
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {todayShiftType.entrada} - {todayShiftType.salida}
                    </div>
                  )}
                </div>
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60 p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Registrar entrada/salida</h3>
                  <CheckInOut
                    assignmentId={todayAssignment.id}
                    hasCheckin={!!todayAssignment.checkin_at}
                    hasCheckout={!!todayAssignment.checkout_at}
                    onCheckin={() => fetchData()}
                    onCheckout={() => fetchData()}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {!loading && activeTab === 'novedad' && (
          <ContingencyReport
            employeeId={employee?.alias || ''}
            scheduleId={schedule?.id || null}
            onSubmitted={() => fetchData()}
          />
        )}

        {!loading && activeTab === 'horas' && (
          <div className="space-y-4">
            {/* Total */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]/60 p-4">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Horas trabajadas esta semana</div>
              <div className="text-3xl font-mono font-bold text-[var(--color-ak-borgona)]">
                {totalWorkedHours}h
              </div>
            </div>

            {/* Daily breakdown */}
            {dailyHours.length > 0 ? (
              <div className="space-y-2">
                {dailyHours.map((d, i) => (
                  <div key={i} className="bg-[var(--bg-card)] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      {d.type && (
                        <div className="text-xs text-amber-400">{d.type}{d.description ? `: ${d.description}` : ''}</div>
                      )}
                    </div>
                    {d.hours > 0 && (
                      <div className="text-sm font-mono font-medium text-emerald-400">{d.hours}h</div>
                    )}
                    {d.checkin && !d.type && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        <span className="text-emerald-400">
                          {new Date(d.checkin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {' → '}
                        {d.checkout ? (
                          <span className="text-blue-400">
                            {new Date(d.checkout).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">en turno</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center text-[var(--text-secondary)]">
                <Timer size={36} className="mx-auto mb-2 opacity-30" />
                <p>No hay registros de horas para esta semana</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}