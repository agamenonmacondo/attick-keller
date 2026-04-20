'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { AdminHeader } from './AdminHeader'
import { AdminTabBar, type AdminTab } from './AdminTabBar'
import { ReservationsPanel } from './reservations/ReservationsPanel'
import { OccupancyPanel } from './occupancy/OccupancyPanel'
import { MetricsPanel } from './metrics/MetricsPanel'
import { CustomersPanel } from './customers/CustomersPanel'
import { MenuPanel } from './menu/MenuPanel'
import { Spinner } from '@phosphor-icons/react'

export function AdminShell() {
  const { user, loading: authLoading, isAdmin, roleLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>('reservas')
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

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

  if (!isAdmin) {
    router.replace('/perfil')
    return null
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5EDE0]">
      <AdminHeader />
      <AdminTabBar active={activeTab} onChange={setActiveTab} />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {activeTab === 'reservas' && (
          <ReservationsPanel selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {activeTab === 'ocupacion' && (
          <OccupancyPanel selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {activeTab === 'metricas' && <MetricsPanel />}
        {activeTab === 'clientes' && <CustomersPanel />}
        {activeTab === 'menu' && <MenuPanel />}
      </main>
    </div>
  )
}