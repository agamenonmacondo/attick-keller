'use client'

import { useState, useCallback } from 'react'
import { Plus, X, WarningCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
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
import { AssignTablePopup } from '../../host/AssignTablePopup'
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
  const [assignTarget, setAssignTarget] = useState<{
    id: string
    partySize: number
    customerName: string
    timeStart: string
    timeEnd: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const showError = useCallback((message: string) => {
    setError(message)
    setTimeout(() => setError(null), 4000)
  }, [])

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
          showError(d.error || 'Error al cambiar estado')
        }
      } catch {
        showError('Error de conexion')
      }
      setConfirmAction(null)
    },
    [dashRefetch, resRefetch, showError],
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
          showError(d.error || 'Error al guardar')
        }
      } catch {
        showError('Error de conexion')
      }
    },
    [dashRefetch, resRefetch, showError],
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
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-ak-borgona)]/90 dark:hover:bg-[var(--color-ak-borgona-light)]/90 active:scale-[0.97] transition-all duration-200"
        >
          <Plus size={16} weight="bold" />
          Nueva Reserva
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 text-sm text-[var(--color-danger)]"
        >
          {error}
        </motion.div>
      )}

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

      {/* Alert: unassigned reservations */}
      {(() => {
        const unassigned = dayReservations.filter(r => {
          const status = r.status as string
          return ['confirmed', 'pending', 'pre_paid'].includes(status) && !r.table_id
        })
        if (unassigned.length === 0) return null
        const totalUnassignedPax = unassigned.reduce((s, r) => s + (r.party_size as number), 0)
        const hasBigEvent = unassigned.some(r => (r.party_size as number) >= 20)
        return (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mt-3 rounded-xl border p-3 cursor-pointer transition-all hover:ring-2',
              hasBigEvent
                ? 'border-[var(--color-ak-ambar)]/50 dark:border-[var(--color-ak-ambar-light)]/50 bg-[var(--color-ak-ambar)]/5 dark:bg-[var(--color-ak-ambar-light)]/10 hover:ring-[var(--color-ak-ambar)]/30 dark:hover:ring-[var(--color-ak-ambar-light)]/30'
                : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:ring-[var(--text-secondary)]/20'
            )}
            onClick={() => {
              const largest = unassigned.reduce((a, b) =>
                (a.party_size as number) > (b.party_size as number) ? a : b
              )
              const custData = largest.customers as { full_name: string } | null
              setAssignTarget({
                id: largest.id as string,
                partySize: largest.party_size as number,
                customerName: custData?.full_name || 'Sin nombre',
                timeStart: (largest.time_start as string) || '',
                timeEnd: (largest.time_end as string) || '',
              })
            }}
          >
            <div className="flex items-start gap-2">
              <WarningCircle size={18} weight="fill" className={cn(
                'shrink-0 mt-0.5',
                hasBigEvent ? 'text-[var(--color-ak-ambar)] dark:text-[var(--color-ak-ambar-light)]' : 'text-[var(--text-secondary)]'
              )} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {unassigned.length} reserva{unassigned.length > 1 ? 's' : ''} sin mesa asignada
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {totalUnassignedPax} PAX · {hasBigEvent ? 'Incluye evento grande — click para asignar' : 'Click para asignar'}
                </p>
              </div>
            </div>
          </motion.div>
        )
      })()}

      <div className="mt-4">
        <ReservationTimeline
          reservations={filteredReservations}
          loading={resLoading}
          detailId={detailId}
          onSelect={setDetailId}
          onConfirm={(id) => handleStatusChange(id, 'confirmed')}
          onCancel={(id) => {
            setConfirmAction({ id, status: 'cancelled', label: 'Cancelar Reserva' })
          }}
        />
      </div>

      {/* Reservation Detail Popup */}
      {detailId && detailReservation && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4" onClick={() => setDetailId(null)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-xl"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 24px)' }}
            onClick={e => e.stopPropagation()}
          >
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
          </div>
        </div>
      )}

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

      {assignTarget && (
        <AssignTablePopup
          reservationId={assignTarget.id}
          partySize={assignTarget.partySize}
          customerName={assignTarget.customerName}
          timeStart={assignTarget.timeStart}
          timeEnd={assignTarget.timeEnd}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            dashRefetch()
            resRefetch()
          }}
        />
      )}
    </>
  )
}