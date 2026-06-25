'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { getWeekStr } from '@/lib/utils/costCalculator'
import { CaretLeft, CaretRight, ClockClockwise, ClockAfternoon, WarningCircle, Timer } from '@phosphor-icons/react'
import { cn } from '@/lib/utils/cn'
import { MiTurnoSchedule } from './MiTurnoSchedule'
import { MiTurnoCheckInOut } from './MiTurnoCheckInOut'
import { MiTurnoHours } from './MiTurnoHours'
import { MiTurnoNovedad } from './MiTurnoNovedad'
import type { ShiftType, ShiftAssignment } from '@/lib/types/shifts'

type SubTab = 'horario' | 'checkin' | 'novedad' | 'horas'

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'horario', label: 'Mi Horario', icon: <ClockClockwise size={16} weight="regular" /> },
  { key: 'checkin', label: 'Check In/Out', icon: <ClockAfternoon size={16} weight="regular" /> },
  { key: 'novedad', label: 'Novedad', icon: <WarningCircle size={16} weight="regular" /> },
  { key: 'horas', label: 'Mis Horas', icon: <Timer size={16} weight="regular" /> },
]

interface MyWeekData {
  employee: { id: string; nombre_completo: string; cargo: string; area: string; salario: number; alias: string } | null
  schedule: { id: string; week_str: string; status: string } | null
  assignments: ShiftAssignment[]
  shift_types: ShiftType[]
}

interface MyHoursData {
  employee_id: string
  week_str: string
  total_worked_hours: number
  daily: { date: string; checkin: string | null; checkout: string | null; hours: number; type?: string; description?: string }[]
}

export function MiTurnoPanel() {
  const { user } = useAuth()
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('horario')
  const [weekStr, setWeekStr] = useState(() => getWeekStr(new Date()))
  const [weekData, setWeekData] = useState<MyWeekData | null>(null)
  const [hoursData, setHoursData] = useState<MyHoursData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileMissing, setProfileMissing] = useState(false)

  const loadWeek = useCallback(async (ws: string) => {
    setLoading(true)
    setError(null)
    setProfileMissing(false)
    try {
      const res = await fetch(`/api/admin/shift-my-week?week_str=${encodeURIComponent(ws)}`)
      if (res.status === 404) {
        const body = await res.json().catch(() => ({}))
        if (body?.error === 'Perfil de colaborador no encontrado' || body?.error === 'Empleado no encontrado') {
          setProfileMissing(true)
          setWeekData(null)
          setLoading(false)
          return
        }
        throw new Error(body?.error || 'No autorizado')
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Error cargando tu semana')
      }
      const data = (await res.json()) as MyWeekData
      setWeekData(data)

      // Horas — cargar en paralelo conceptual (después del ok)
      const hRes = await fetch(`/api/admin/shift-my-hours?week_str=${encodeURIComponent(ws)}`)
      if (hRes.ok) {
        setHoursData(await hRes.json())
      } else {
        setHoursData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setWeekData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeek(weekStr)
  }, [weekStr, loadWeek])

  const refreshHours = useCallback(async () => {
    const hRes = await fetch(`/api/admin/shift-my-hours?week_str=${encodeURIComponent(weekStr)}`)
    if (hRes.ok) setHoursData(await hRes.json())
  }, [weekStr])

  const handleCheckinUpdate = useCallback((updates: { assignmentId: string; checkinAt?: string | null; checkoutAt?: string | null }) => {
    setWeekData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        assignments: prev.assignments.map(a =>
          a.id === updates.assignmentId
            ? { ...a, checkin_at: updates.checkinAt ?? a.checkin_at, checkout_at: updates.checkoutAt ?? a.checkout_at }
            : a
        ),
      }
    })
    refreshHours()
  }, [refreshHours])

  const shiftWeek = (delta: number) => {
    // Ajusta weekStr en ±1 semana usando getWeekStr sobre una fecha desplazada
    const [year, week] = weekStr.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(Date.UTC(year, 0, 4 - dayOfWeek + 1 + (week - 1) * 7))
    monday.setUTCDate(monday.getUTCDate() + delta * 7)
    setWeekStr(getWeekStr(monday))
  }

  return (
    <div className="space-y-5">
      {/* Header + navegador de semana */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--text-primary)]">Mi Turno</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {weekData?.employee
                ? `${weekData.employee.alias} · ${weekData.employee.cargo} · ${weekData.employee.area}`
                : 'Tu horario personal'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => shiftWeek(-1)}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-ak-borgona)]/50 transition-colors"
              aria-label="Semana anterior"
            >
              <CaretLeft size={16} />
            </button>
            <span className="px-3 py-2 text-sm font-mono text-[var(--text-primary)] tabular-nums">{weekStr}</span>
            <button
              onClick={() => shiftWeek(1)}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-ak-borgona)]/50 transition-colors"
              aria-label="Semana siguiente"
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs internos */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide -mt-1">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeSubTab === tab.key
                ? 'bg-[var(--color-ak-borgona)]/15 text-[var(--color-ak-borgona)] border border-[var(--color-ak-borgona)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Edge cases */}
      {loading && (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center text-[var(--text-secondary)] text-sm">
          Cargando tu semana…
        </div>
      )}

      {profileMissing && !loading && (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center">
          <WarningCircle size={40} className="mx-auto mb-3 opacity-40 text-[var(--color-warning)]" />
          <p className="text-[var(--text-primary)] font-medium">No tienes perfil de colaborador</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tu usuario no está vinculado a un registro de nómina. Contacta al administrador.
          </p>
        </div>
      )}

      {error && !loading && !profileMissing && (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 text-center text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Contenido por sub-tab */}
      {!loading && !profileMissing && !error && weekData && (
        <>
          {activeSubTab === 'horario' && (
            <MiTurnoSchedule
              assignments={weekData.assignments}
              shiftTypes={weekData.shift_types}
              weekStr={weekStr}
              schedule={weekData.schedule}
            />
          )}
          {activeSubTab === 'checkin' && (
            <MiTurnoCheckInOut
              assignments={weekData.assignments}
              shiftTypes={weekData.shift_types}
              weekStr={weekStr}
              onCheckinUpdate={handleCheckinUpdate}
            />
          )}
          {activeSubTab === 'horas' && <MiTurnoHours hoursData={hoursData} weekStr={weekStr} />}
          {activeSubTab === 'novedad' && (
            <MiTurnoNovedad employeeId={weekData.employee?.id} scheduleId={weekData.schedule?.id ?? null} onSubmitted={refreshHours} />
          )}
        </>
      )}
    </div>
  )
}