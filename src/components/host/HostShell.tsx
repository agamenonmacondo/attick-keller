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
import { useHostDashboard } from '@/lib/hooks/useHostDashboard'
import { useHostOccupancy } from '@/lib/hooks/useHostOccupancy'
import { Spinner, Table, CalendarDots, Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

const SPRING = { stiffness: 100, damping: 20, mass: 1 }

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

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

type HostTab = 'mesas' | 'reservas'

export function HostShell() {
  const { user, loading: authLoading, roleLoading, isHost, isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HostTab>('mesas')
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefersReduced = usePrefersReducedMotion()

  const { data: dashData, loading: dashLoading, refetch: refetchDash } = useHostDashboard()
  const { data: occupancyData, loading: occLoading, refetch: refetchOcc } = useHostOccupancy()

  const handleRefetch = () => {
    refetchDash()
    refetchOcc()
  }

  const reservations = dashData?.reservations || []
  const todayStats = dashData?.todayStats
  const occupancy = dashData?.occupancy
  const zones = occupancyData?.zones || []

  const pendingCount = todayStats?.pending ?? 0
  const confirmedCount = todayStats?.confirmed ?? 0

  const sortedReservations = [...reservations].sort((a, b) =>
    String(a.time_start || '').localeCompare(String(b.time_start || ''))
  )

  const handleConfirmNext = async () => {
    const next = sortedReservations.find(r => r.status === 'pending')
    if (!next) return
    try {
      const res = await fetch(`/api/admin/reservations/${next.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al confirmar')
        setTimeout(() => setError(null), 4000)
      } else {
        handleRefetch()
      }
    } catch {
      setError('Error de conexion')
      setTimeout(() => setError(null), 4000)
    }
  }

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
      <div className="min-h-[100dvh] bg-[#F5EDE0] flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-[#8D6E63]" />
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
    <div className="min-h-[100dvh] bg-[#F5EDE0] flex flex-col">
      <HostHeader />

      {/* Mobile tab switcher */}
      <div className="lg:hidden border-b border-[#D7CCC8] bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'mesas' ? 'border-[#6B2737] text-[#3E2723]' : 'border-transparent text-[#8D6E63]'
            }`}
            style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
          >
            <Table size={18} />
            Mesas
          </button>
          <button
            onClick={() => setActiveTab('reservas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'reservas' ? 'border-[#6B2737] text-[#3E2723]' : 'border-transparent text-[#8D6E63]'
            }`}
            style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
          >
            <CalendarDots size={18} />
            Reservas
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
            className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Occupancy summary */}
        {isLoading && !todayStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#D7CCC8] p-3 md:p-4">
                <div className="mx-auto h-4 w-20 bg-[#D7CCC8]/50 rounded animate-pulse mb-2" />
                <div className="mx-auto h-8 w-12 bg-[#D7CCC8]/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : todayStats && occupancy ? (
          <HostOccupancySummary stats={todayStats} occupancy={occupancy} />
        ) : null}

        {/* Quick actions */}
        <motion.div variants={prefersReduced ? undefined : itemVariants}>
          <HostQuickActions
            onConfirmNext={handleConfirmNext}
            onSeatNext={handleSeatNext}
            pendingCount={pendingCount}
            confirmedCount={confirmedCount}
          />
        </motion.div>

        {/* Desktop: two columns. Mobile: tab switcher */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-6 mt-4">
          <div className={`lg:col-span-3 ${activeTab !== 'mesas' ? 'hidden lg:block' : ''}`}>
            {isLoading && zones.length === 0 ? (
              <div className="space-y-4">
                <div className="h-6 w-32 bg-[#D7CCC8]/50 rounded animate-pulse" />
                <div className="h-4 w-20 bg-[#D7CCC8]/50 rounded animate-pulse mb-2" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 bg-white rounded-xl border border-[#D7CCC8] animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <HostTableMap
                zones={zones}
                reservations={reservations}
                onAction={handleRefetch}
              />
            )}
          </div>
          <div className={`lg:col-span-2 mt-4 lg:mt-0 ${activeTab !== 'reservas' ? 'hidden lg:block' : ''}`}>
            {isLoading && reservations.length === 0 ? (
              <div className="space-y-3">
                <div className="h-6 w-40 bg-[#D7CCC8]/50 rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-xl border border-[#D7CCC8] animate-pulse" />
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
      </motion.div>

      {/* Walk-in button */}
      <button
        onClick={() => setShowWalkIn(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#6B2737] text-white shadow-lg flex items-center justify-center hover:bg-[#5C2230] active:scale-[0.97]"
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
    </div>
  )
}
