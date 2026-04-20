'use client'

import { useState, useCallback } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard'
import { useAdminReservations } from '@/lib/hooks/useAdminReservations'
import { useDatesWithReservations } from '@/lib/hooks/useDatesWithReservations'
import { ReservationCalendar } from './ReservationCalendar'
import { DayStatsRow } from './DayStatsRow'
import { StatusFilter } from './StatusFilter'
import { ReservationTimeline } from './ReservationTimeline'
import { ReservationDetail } from './ReservationDetail'
import { ReservationForm } from './ReservationForm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Spinner } from '@phosphor-icons/react'

interface ReservationsPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function ReservationsPanel({ selectedDate, onDateChange }: ReservationsPanelProps) {
  const [filter, setFilter] = useState('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    id: string
    status: string
    label: string
  } | null>(null)

  const {
    data: dashData,
    loading: dashLoading,
    refetch: dashRefetch,
  } = useAdminDashboard(selectedDate)
  const {
    reservations,
    loading: resLoading,
    refetch: resRefetch,
  } = useAdminReservations(selectedDate, filter)
  const { dates: datesWithReservations, days: reservationDays } = useDatesWithReservations(selectedDate)

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      try {
        const res = await fetch(`/api/admin/reservations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (res.ok) {
          dashRefetch()
          resRefetch()
          setDetailId(null)
        } else {
          const d = await res.json()
          alert(d.error || 'Error al cambiar estado')
        }
      } catch {
        alert('Error de conexion')
      }
      setConfirmAction(null)
    },
    [dashRefetch, resRefetch],
  )

  const handleEdit = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/admin/reservations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (res.ok) {
          dashRefetch()
          resRefetch()
        } else {
          const d = await res.json()
          alert(d.error || 'Error al guardar')
        }
      } catch {
        alert('Error de conexion')
      }
    },
    [dashRefetch, resRefetch],
  )

  const handleCreated = useCallback(() => {
    dashRefetch()
    resRefetch()
  }, [dashRefetch, resRefetch])

  const loading = dashLoading && !dashData

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size={32} className="animate-spin text-[#8D6E63]" />
      </div>
    )
  }

  const dayReservations = reservations.filter((r) => r.date === selectedDate)
  const detailReservation = detailId
    ? dayReservations.find((r) => r.id === detailId) ?? null
    : null

  return (
    <>
      {/* New Reservation Button */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#6B2737] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6B2737]/90 active:scale-[0.97]"
          style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        >
          <Plus size={16} weight="bold" />
          Nueva Reserva
        </button>
      </div>

      <ReservationCalendar
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        days={reservationDays}
      />

      {dashData && <DayStatsRow stats={dashData.todayStats} />}

      <StatusFilter
        active={filter}
        onChange={setFilter}
        counts={{
          all: dashData?.todayStats.total ?? 0,
          pending: dashData?.todayStats.pending ?? 0,
          confirmed: dashData?.todayStats.confirmed ?? 0,
          seated: dashData?.todayStats.seated ?? 0,
          cancelled: dashData?.todayStats.cancelled ?? 0,
        }}
      />

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReservationTimeline
            reservations={dayReservations}
            loading={resLoading}
            detailId={detailId}
            onSelect={setDetailId}
          />
        </div>
        <div className="lg:col-span-1">
          <ReservationDetail
            reservation={detailReservation}
            onStatusChange={(id, status) => {
              if (status === 'cancelled') {
                setConfirmAction({ id, status, label: 'Cancelar Reserva' })
              } else {
                handleStatusChange(id, status)
              }
            }}
            onEdit={handleEdit}
            onClose={() => setDetailId(null)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.label ?? ''}
        description="Esta accion no se puede deshacer. Se notificara al cliente."
        confirmLabel="Confirmar"
        confirmVariant="danger"
        onConfirm={() => {
          if (confirmAction) {
            handleStatusChange(confirmAction.id, confirmAction.status)
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {showNewForm && (
        <ReservationForm
          selectedDate={selectedDate}
          onClose={() => setShowNewForm(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}