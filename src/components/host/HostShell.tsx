'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { HostHeader } from './HostHeader'
import { HostTableMap } from './HostTableMap'
import { HostReservationQueue } from './HostReservationQueue'
import { HostOccupancySummary } from './HostOccupancySummary'
import { HostQuickActions } from './HostQuickActions'
import { HostWalkInForm } from './HostWalkInForm'
import { HostFloorPlan } from './HostFloorPlan'
import { ReassignModal } from './ReassignModal'
import { useHostDashboard } from '@/lib/hooks/useHostDashboard'
import { useHostOccupancy } from '@/lib/hooks/useHostOccupancy'
import type { ReservationTimeline } from '@/lib/hooks/useHostOccupancy'
import { Spinner, Table, CalendarDots, Plus, MapTrifold } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8, transform: 'translateY(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    transform: 'translateY(0px)',
    transition: { type: 'spring' as const, ...SPRING },
  },
}

type HostTab = 'mesas' | 'reservas' | 'plano'

export function HostShell() {
  const { user, loading: authLoading, roleLoading, isHost, isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HostTab>('mesas')
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [reassignTarget, setReassignTarget] = useState<{
    reservation: ReservationTimeline
    tableInfo: { id: string; name: string; zoneName: string }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prefersReduced = usePrefersReducedMotion()

  const { data: dashData, loading: dashLoading, refetch: refetchDash } = useHostDashboard()
  const { data: occupancyData, loading: occLoading, refetch: refetchOcc, zoneSummaries, quickStats } = useHostOccupancy()

  const handleRefetch = () => {
    refetchDash()
    refetchOcc()
  }

  const reservations = dashData?.reservations || []
  const todayStats = dashData?.todayStats
  const occupancy = dashData?.occupancy
  const zones = occupancyData?.zones || []

  const confirmedCount = todayStats?.confirmed ?? 0

  const sortedReservations = [...reservations].sort((a, b) =>
    String(a.time_start || '').localeCompare(String(b.time_start || ''))
  )

  const handleSeatNext = async () => {
    const next = sortedReservations.find(r => r.status === 'confirmed')
    if (!next) return
    try {
      const res = await fetch(`/api/admin/reservations/${next.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'seated' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al sentar')
        setTimeout(() => setError(null), 4000)
      } else {
        handleRefetch()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    }
  }

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  if (!isHost && !isAdmin) {
    router.replace('/perfil')
    return null
  }

  const isLoading = dashLoading || occLoading

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col">
      <HostHeader />

      {/* Mobile tab switcher */}
      <div className="lg:hidden border-b border-[var(--border-default)] bg-[var(--bg-card)]">
        <div className="flex">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'mesas' ? 'border-[var(--color-ak-borgona)] text-[var(--color-ak-madera)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
            style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
          >
            <Table size={16} />
            Mesas
          </button>
          <button
            onClick={() => setActiveTab('reservas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'reservas' ? 'border-[var(--color-ak-borgona)] text-[var(--color-ak-madera)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
            style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
          >
            <CalendarDots size={16} />
            Reservas
          </button>
          <button
            onClick={() => setActiveTab('plano')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'plano' ? 'border-[var(--color-ak-borgona)] text-[var(--color-ak-madera)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
            style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
          >
            <MapTrifold size={16} />
            Plano
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-4"
        variants={prefersReduced ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Error toast */}
        {error && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-4 py-3 text-sm text-[var(--color-danger)]"
          >
            {error}
          </motion.div>
        )}

        {/* Occupancy summary */}
        {isLoading && !todayStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-3 md:p-4">
                <div className="mx-auto h-4 w-20 bg-[var(--border-default)]/50 rounded animate-pulse mb-2" />
                <div className="mx-auto h-8 w-12 bg-[var(--border-default)]/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : todayStats && occupancy ? (
          <HostOccupancySummary stats={todayStats} occupancy={occupancy} quickStats={quickStats} zoneSummaries={zoneSummaries} />
        ) : null}

        {/* Quick actions */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <HostQuickActions
            onSeatNext={handleSeatNext}
            confirmedCount={confirmedCount}
          />
        </motion.div>

        {/* Desktop view toggle — show when Plano tab is relevant */}
        <div className="hidden lg:flex items-center gap-2 mt-4 mb-2">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'mesas' || activeTab === 'reservas'
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--color-ak-borgona)]'
            }`}
          >
            <Table size={16} />
            Mesas + Reservas
          </button>
          <button
            onClick={() => setActiveTab('plano')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'plano'
                ? 'bg-[var(--color-ak-borgona)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--color-ak-borgona)]'
            }`}
          >
            <MapTrifold size={16} />
            Plano
          </button>
        </div>

        {/* Desktop: two columns. Mobile: tab switcher */}
        <div className={`lg:grid lg:grid-cols-5 lg:gap-6 mt-4 ${activeTab === 'plano' ? 'hidden' : ''}`}>
          <div className={`lg:col-span-3 ${activeTab !== 'mesas' ? 'hidden lg:block' : ''}`}>
            {isLoading && zones.length === 0 ? (
              <div className="space-y-4">
                <div className="h-6 w-32 bg-[var(--border-default)]/50 rounded animate-pulse" />
                <div className="h-4 w-20 bg-[var(--border-default)]/50 rounded animate-pulse mb-2" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <HostTableMap
                zones={zones}
                reservations={reservations}
                onAction={handleRefetch}
                currentTime={occupancyData?.current_time || undefined}
                onReassign={(reservation, tableInfo) => setReassignTarget({ reservation, tableInfo })}
              />
            )}
          </div>
          <div className={`lg:col-span-2 mt-4 lg:mt-0 ${activeTab !== 'reservas' ? 'hidden lg:block' : ''}`}>
            {isLoading && reservations.length === 0 ? (
              <div className="space-y-3">
                <div className="h-6 w-40 bg-[var(--border-default)]/50 rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <HostReservationQueue
                reservations={reservations}
                onAction={handleRefetch}
              />
            )}
          </div>
        </div>

        {/* Floor Plan tab (mobile + desktop) */}
        {activeTab === 'plano' && (
          <div className="mt-4">
            <HostFloorPlan />
          </div>
        )}
      </motion.div>

      {/* Walk-in button */}
      <button
        onClick={() => setShowWalkIn(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--color-ak-borgona)] text-white shadow-lg flex items-center justify-center hover:bg-[var(--color-ak-borgona)] active:scale-[0.97]"
        style={{ transition: 'transform 160ms ease-out, background-color 200ms ease-out' }}
        title="Walk-in"
      >
        <Plus size={24} weight="bold" />
      </button>

      {showWalkIn && (
        <HostWalkInForm
          zones={zones}
          onClose={() => setShowWalkIn(false)}
          onCreated={handleRefetch}
        />
      )}

      {reassignTarget && (
        <ReassignModal
          reservation={reassignTarget.reservation}
          currentTableName={reassignTarget.tableInfo.name}
          currentZoneName={reassignTarget.tableInfo.zoneName}
          zones={zones}
          onClose={() => setReassignTarget(null)}
          onReassigned={handleRefetch}
        />
      )}
    </div>
  )
}
