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

type HostTab = 'mesas' | 'reservas'

export function HostShell() {
  const { user, loading: authLoading, roleLoading, isHost, isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HostTab>('mesas')
  const [showWalkIn, setShowWalkIn] = useState(false)

  const { data: dashData, loading: dashLoading, refetch: refetchDash } = useHostDashboard()
  const { data: occupancyData, loading: occLoading, refetch: refetchOcc } = useHostOccupancy()

  const handleRefetch = () => {
    refetchDash()
    refetchOcc()
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

  const reservations = dashData?.reservations || []
  const todayStats = dashData?.todayStats
  const occupancy = dashData?.occupancy
  const zones = occupancyData?.zones || []

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0] flex flex-col">
      <HostHeader />

      {/* Mobile tab switcher */}
      <div className="lg:hidden border-b border-[#D7CCC8] bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'mesas' ? 'border-[#6B2737] text-[#3E2723]' : 'border-transparent text-[#8D6E63]'
            }`}
          >
            <Table size={18} />
            Mesas
          </button>
          <button
            onClick={() => setActiveTab('reservas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'reservas' ? 'border-[#6B2737] text-[#3E2723]' : 'border-transparent text-[#8D6E63]'
            }`}
          >
            <CalendarDots size={18} />
            Reservas
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-4">
        {/* Occupancy summary — always visible */}
        {todayStats && occupancy && (
          <HostOccupancySummary
            stats={todayStats}
            occupancy={occupancy}
          />
        )}

        {/* Desktop: two columns. Mobile: tab switcher */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-6 mt-4">
          <div className={`lg:col-span-3 ${activeTab !== 'mesas' ? 'hidden lg:block' : ''}`}>
            <HostTableMap
              zones={zones}
              reservations={reservations}
              onAction={handleRefetch}
            />
          </div>
          <div className={`lg:col-span-2 mt-4 lg:mt-0 ${activeTab !== 'reservas' ? 'hidden lg:block' : ''}`}>
            <HostReservationQueue
              reservations={reservations}
              onAction={handleRefetch}
            />
          </div>
        </div>
      </div>

      {/* Walk-in button */}
      <button
        onClick={() => setShowWalkIn(true)}
        className="fixed bottom-6 right-6 lg:hidden z-40 w-14 h-14 rounded-full bg-[#6B2737] text-white shadow-lg flex items-center justify-center hover:bg-[#5C2230] active:scale-95 transition-transform"
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