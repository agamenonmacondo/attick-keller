'use client'

import { cn } from '@/lib/utils/cn'
import { CalendarDots, Table, ChartBar, ChartPieSlice, Users, ForkKnife, IdentificationBadge, Coffee, MapTrifold, Buildings, Money, ClockClockwise, Lightning } from '@phosphor-icons/react'

export type AdminTab = 'reservas' | 'ocupacion' | 'mesas' | 'plano' | 'metricas' | 'operacion' | 'clientes' | 'menu' | 'equipo' | 'nomina' | 'turnos' | 'app-rodri' | 'informes'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'reservas', label: 'Reservas', icon: <CalendarDots size={18} weight="regular" /> },
  { key: 'ocupacion', label: 'Ocupacion', icon: <Table size={18} weight="regular" /> },
  { key: 'mesas', label: 'Mesas', icon: <Coffee size={18} weight="regular" /> },
  { key: 'plano', label: 'Plano', icon: <MapTrifold size={18} weight="regular" /> },
  { key: 'metricas', label: 'Metricas', icon: <ChartBar size={18} weight="regular" /> },
  { key: 'operacion', label: 'Operacion', icon: <ChartPieSlice size={18} weight="regular" /> },
  { key: 'clientes', label: 'Clientes', icon: <Users size={18} weight="regular" /> },
  { key: 'menu', label: 'Menu', icon: <ForkKnife size={18} weight="regular" /> },
  { key: 'equipo', label: 'Equipo', icon: <IdentificationBadge size={18} weight="regular" /> },
  { key: 'nomina', label: 'Nomina', icon: <Money size={18} weight="regular" /> },
  { key: 'turnos', label: 'Turnos', icon: <ClockClockwise size={18} weight="regular" /> },
  { key: 'app-rodri', label: 'App Rodri', icon: <Buildings size={18} weight="regular" /> },
  { key: 'informes', label: 'Informes', icon: <Lightning size={18} weight="fill" /> },
]

interface AdminTabBarProps {
  active: AdminTab
  onChange: (tab: AdminTab) => void
}

export function AdminTabBar({ active, onChange }: AdminTabBarProps) {
  return (
    <div className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap',
                active === tab.key ? 'border-[var(--color-ak-borgona)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
              style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}