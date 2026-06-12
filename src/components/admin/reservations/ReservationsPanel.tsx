'use client'

import { useState, useCallback } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAdminDashboard } from '@/lib/hooks/useAdminDashboard'
import { useAdminReservations } from '@/lib/hooks/useAdminReservations'
import { useDatesWithReservations } from '@/lib/hooks/useDatesWithReservations'
import { ReservationCalendar } from './ReservationCalendar'
import { DayStatsRow } from './DayStatsRow'
import { StatusFilter } from './StatusFilter'
import { ServiceFilter } from './ServiceFilter'
import { ReservationTimeline } from './ReservationTimeline'
import { ReservationDetail } from './ReservationDetail'
import { ReservationForm } from './ReservationForm'
import { TableBlockForm } from './TableBlockForm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { Spinner } from '@phosphor-icons/react'
import type { ServiceType } from '@/lib/utils/serviceHours'
import { getServiceType } from '@/lib/utils/serviceHours'

interface ReservationsPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function ReservationsPanel({ selectedDate, onDateChange }: ReservationsPanelProps) {
  const [filter, setFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)
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
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  const dayReservations = reservations.filter((r) => r.date === selectedDate)
  // Apply service filter
  const filteredReservations = serviceFilter === 'all'
    ? dayReservations
    : dayReservations.filter((r) => getServiceType(r.time_start) === serviceFilter)
  // Service counts for filter badges
  const serviceCounts = {
    all: dayReservations.length,
    breakfast: dayReservations.filter(r => getServiceType(r.time_start) === 'breakfast').length,
    lunch: dayReservations.filter(r => getServiceType(r.time_start) === 'lunch').length,
    dinner: dayReservations.filter(r => getServiceType(r.time_start) === 'dinner').length,
  }
  const detailReservation = detailId
    ? filteredReservations.find((r) => r.id === detailId) ?? null
    : null

  return (
    <>
      {/* New Reservation Button */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 dark:hover:bg-[var(--color-ak-borgona-light)]/90 active:scale-[0.97]"
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

      <ServiceFilter
        active={serviceFilter}
        onChange={setServiceFilter}
        counts={serviceCounts}
      />

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReservationTimeline
            reservations={filteredReservations}
            loading={resLoading}
            detailId={detailId}
            onSelect={setDetailId}
            onConfirm={(id) => handleStatusChange(id, 'confirmed')}
            onCancel={(id) => {
              if (window.confirm('¿Cancelar esta reserva? Esta acción no se puede deshacer.')) {
                handleStatusChange(id, 'cancelled')
              }
            }}
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-1"
        >
          {detailId && (
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="md:hidden fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ak-borgona)] text-white shadow-lg active:scale-95 dark:bg-[var(--color-ak-dorado)] dark:text-[var(--color-ak-madera)]"
              style={{ transition: 'transform 160ms ease-out' }}
              aria-label="Cerrar detalle"
            >
              <X size={20} weight="bold" />
            </button>
          )}
          <ReservationDetail
            reservation={detailReservation}
            onStatusChange={(id, status) => {
              if (status === 'cancelled') {
                setConfirmAction({ id, status, label: 'Cancelar Reserva' })
              } else if (status === 'no_show') {
                setConfirmAction({ id, status, label: 'Marcar como No Asistio' })
              } else {
                handleStatusChange(id, status)
              }
            }}
            onEdit={handleEdit}
            onClose={() => setDetailId(null)}
          />
        </motion.div>
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