'use client'

import { cn } from '@/lib/utils/cn'
import { CalendarDots, Table, ChartBar, Users, ForkKnife, IdentificationBadge, Coffee } from '@phosphor-icons/react'

export type AdminTab = 'reservas' | 'ocupacion' | 'mesas' | 'metricas' | 'clientes' | 'menu' | 'equipo'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'reservas', label: 'Reservas', icon: <CalendarDots size={18} weight="regular" /> },
  { key: 'ocupacion', label: 'Ocupacion', icon: <Table size={18} weight="regular" /> },
  { key: 'mesas', label: 'Mesas', icon: <Coffee size={18} weight="regular" /> },
  { key: 'metricas', label: 'Metricas', icon: <ChartBar size={18} weight="regular" /> },
  { key: 'clientes', label: 'Clientes', icon: <Users size={18} weight="regular" /> },
  { key: 'menu', label: 'Menu', icon: <ForkKnife size={18} weight="regular" /> },
  { key: 'equipo', label: 'Equipo', icon: <IdentificationBadge size={18} weight="regular" /> },
]

interface AdminTabBarProps {
  active: AdminTab
  onChange: (tab: AdminTab) => void
}

export function AdminTabBar({ active, onChange }: AdminTabBarProps) {
  return (
    <div className="border-b border-[#D7CCC8] bg-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap',
                active === tab.key ? 'border-[#6B2737] text-[#3E2723]' : 'border-transparent text-[#8D6E63] hover:text-[#3E2723]'
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