'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { AdminHeader } from './AdminHeader'
import { AdminTabBar, type AdminTab } from './AdminTabBar'
import { ReservationsPanel } from './reservations/ReservationsPanel'
import { OccupancyPanel } from './occupancy/OccupancyPanel'
import { MetricsPanel } from './metrics/MetricsPanel'
import { POSDashboardPanel } from './pos-dashboard/POSDashboardPanel'
import { CustomersPanel } from './customers/CustomersPanel'
import { MenuPanel } from './menu/MenuPanel'
import { TeamPanel } from './team/TeamPanel'
import { TablesPanel } from './inventory/TablesPanel'
import { FloorPlanMap } from './floorplan/FloorPlanMap'
import { NominaUnifiedPanel } from './nomina/NominaUnifiedPanel'
import { RodriPanel } from './rodri/RodriPanel'
import ShiftSchedulePanel from './shifts/ShiftSchedulePanel'
import { InformesRayoPanel } from './informes/InformesRayoPanel'
import { Spinner } from '@phosphor-icons/react'

// Tabs que CADA ROL desbloquea (se unen si el usuario tiene varios roles)
const ROLE_TABS: Record<string, AdminTab[]> = {
  super_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas', 'operacion', 'clientes', 'menu', 'equipo', 'nomina', 'turnos', 'app-rodri', 'informes'],
  store_admin: ['reservas', 'ocupacion', 'mesas', 'plano', 'metricas'],
  host: ['reservas', 'ocupacion'],
  lider_area: ['turnos'],
}

function computeAllowedTabs(roles: string[]): AdminTab[] {
  const set = new Set<AdminTab>()
  for (const role of roles) {
    const tabs = ROLE_TABS[role]
    if (tabs) for (const t of tabs) set.add(t)
  }
  return [...set]
}

function hasAnyAdminAccess(roles: string[]): boolean {
  return roles.some(r => r in ROLE_TABS)
}

export function AdminShell() {
  const { user, loading: authLoading, roles, area, roleLoading } = useAuth()
  const router = useRouter()
  const allowedTabs = computeAllowedTabs(roles)
  const [activeTab, setActiveTab] = useState<AdminTab>(
    () => allowedTabs[0] || 'reservas'
  )
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  })

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

  if (!hasAnyAdminAccess(roles)) {
    router.replace('/perfil')
    return null
  }

  if (!allowedTabs.includes(activeTab)) {
    setActiveTab(allowedTabs[0])
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      <AdminHeader />
      <AdminTabBar active={activeTab} onChange={setActiveTab} allowedTabs={allowedTabs} />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        {activeTab === 'reservas' && (
          <ReservationsPanel selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {activeTab === 'ocupacion' && (
          <OccupancyPanel selectedDate={selectedDate} onDateChange={setSelectedDate} />
        )}
        {activeTab === 'mesas' && <TablesPanel />}
        {activeTab === 'plano' && <FloorPlanMap />}
        {activeTab === 'metricas' && <MetricsPanel />}
        {activeTab === 'operacion' && <POSDashboardPanel />}
        {activeTab === 'clientes' && <CustomersPanel />}
        {activeTab === 'menu' && <MenuPanel />}
        {activeTab === 'equipo' && <TeamPanel />}
        {activeTab === 'nomina' && <NominaUnifiedPanel />}
        {activeTab === 'turnos' && <ShiftSchedulePanel areaFilter={area ?? undefined} />}
        {activeTab === 'app-rodri' && <RodriPanel />}
        {activeTab === 'informes' && <InformesRayoPanel />}
      </main>
    </div>
  )
}
