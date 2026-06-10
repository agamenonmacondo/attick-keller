1|'use client'
2|
3|import { cn } from '@/lib/utils/cn'
4|import { CalendarDots, Table, ChartBar, ChartPieSlice, Users, ForkKnife, IdentificationBadge, Coffee, MapTrifold, Buildings, Money, ClockClockwise, Lightning } from '@phosphor-icons/react'
5|
6|export type AdminTab = 'reservas' | 'ocupacion' | 'mesas' | 'plano' | 'metricas' | 'operacion' | 'clientes' | 'menu' | 'equipo' | 'nomina' | 'turnos' | 'app-rodri' | 'informes'
7|
8|const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
9|  { key: 'reservas', label: 'Reservas', icon: <CalendarDots size={18} weight="regular" /> },
10|  { key: 'ocupacion', label: 'Ocupacion', icon: <Table size={18} weight="regular" /> },
11|  { key: 'mesas', label: 'Mesas', icon: <Coffee size={18} weight="regular" /> },
12|  { key: 'plano', label: 'Plano', icon: <MapTrifold size={18} weight="regular" /> },
13|  { key: 'metricas', label: 'Metricas', icon: <ChartBar size={18} weight="regular" /> },
14|  { key: 'operacion', label: 'Operacion', icon: <ChartPieSlice size={18} weight="regular" /> },
15|  { key: 'clientes', label: 'Clientes', icon: <Users size={18} weight="regular" /> },
16|  { key: 'menu', label: 'Menu', icon: <ForkKnife size={18} weight="regular" /> },
17|  { key: 'equipo', label: 'Equipo', icon: <IdentificationBadge size={18} weight="regular" /> },
18|  { key: 'nomina', label: 'Nomina', icon: <Money size={18} weight="regular" /> },
19|  { key: 'turnos', label: 'Turnos', icon: <ClockClockwise size={18} weight="regular" /> },
20|  { key: 'app-rodri', label: 'App Rodri', icon: <Buildings size={18} weight="regular" /> },
21|  { key: 'informes', label: 'Informes', icon: <Lightning size={18} weight="fill" /> },
22|]
23|
24|interface AdminTabBarProps {
25|  active: AdminTab
26|  onChange: (tab: AdminTab) => void
27|  allowedTabs: AdminTab[]
28|}
29|
30|export function AdminTabBar({ active, onChange, allowedTabs }: AdminTabBarProps) {
31|  const visibleTabs = TABS.filter(tab => allowedTabs.includes(tab.key))
32|
33|  return (
34|    <div className="border-b border-[var(--border-default)] bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10">
35|      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
36|        <nav className="flex gap-1 overflow-x-auto -mb-px">
37|          {visibleTabs.map(tab => (
38|            <button
39|              key={tab.key}
40|              onClick={() => onChange(tab.key)}
41|              className={cn(
42|                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap',
43|                active === tab.key ? 'border-[var(--color-ak-borgona)] dark:border-[var(--color-ak-borgona-light)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
44|              )}
45|              style={{ transition: 'color 200ms ease-out, border-color 200ms ease-out' }}
46|            >
47|              {tab.icon}
48|              <span className="hidden sm:inline">{tab.label}</span>
49|            </button>
50|          ))}
51|        </nav>
52|      </div>
53|    </div>
54|  )
55|}
56|