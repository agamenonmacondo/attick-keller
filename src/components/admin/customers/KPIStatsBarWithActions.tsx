'use client'

import type { AnalyticsOverview } from '@/lib/hooks/useCustomerAnalytics'
import { AnimatedCard } from '../shared/AnimatedCard'
import { Users, ArrowsClockwise, Calendar, Fire, Warning, CurrencyDollar } from '@phosphor-icons/react'

interface KPIStatsBarProps {
  overview: AnalyticsOverview | null
  loading: boolean
}

export function KPIStatsBarWithActions({ overview, loading }: KPIStatsBarProps) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#F5EDE0] rounded-xl shadow-sm border border-[#D7CCC8] p-4 animate-pulse">
            <div className="h-3 bg-[#D7CCC8] rounded w-2/3 mb-2"></div>
            <div className="h-6 bg-[#D7CCC8] rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  const avgSpend = overview.avgSpendPerVisit ?? 0
  const spendDisplay = avgSpend === 0 ? 'Dato no disponible' : `$${avgSpend.toLocaleString()}`

  const kpis = [
    {
      icon: Users,
      label: 'Total Clientes',
      value: overview.totalCustomers.toLocaleString(),
      subtext: undefined,
      action: null,
      iconColor: '#6B2737',
    },
    {
      icon: ArrowsClockwise,
      label: 'Recurrentes',
      value: overview.recurring.toLocaleString(),
      subtext: `${Math.round((overview.recurring / overview.totalCustomers) * 100)}%`,
      action: null,
      iconColor: '#5C7A4D',
    },
    {
      icon: Calendar,
      label: 'Activos (30d)',
      value: overview.recent30.toLocaleString(),
      subtext: `${Math.round((overview.recent30 / overview.totalCustomers) * 100)}%`,
      action: null,
      iconColor: '#D4922A',
    },
    {
      icon: Fire,
      label: 'Dormidos',
      value: overview.reactivation?.dormantClients?.toLocaleString() || overview.retention.oneTime.toLocaleString(),
      subtext: `${overview.reactivation?.reachableWhatsApp?.toLocaleString() || '—'} por WhatsApp`,
      action: { label: 'Reactivar', color: 'bg-[#5C7A4D] hover:bg-[#4A6340]' },
      iconColor: '#A0522D',
    },
    {
      icon: Warning,
      label: 'No-Show',
      value: overview.noShowRisk.highRisk.toString(),
      subtext: `${overview.noShowRisk.medRisk} medio + ${overview.noShowRisk.lowRisk} bajo`,
      action: { label: 'Ver alertas', color: 'bg-[#D4922A] hover:bg-[#B87A1F]' },
      iconColor: '#D4922A',
    },
    {
      icon: CurrencyDollar,
      label: 'Gasto/Visita',
      value: spendDisplay,
      subtext: undefined,
      action: null,
      iconColor: '#C9A94E',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon
        return (
          <AnimatedCard key={i} delay={i * 0.05}>
            <div className="p-4 text-center">
              <Icon size={20} weight="duotone" color={kpi.iconColor} className="mx-auto mb-1" />
              <div className="text-[10px] text-[#8D6E63] uppercase tracking-wider">{kpi.label}</div>
              <div className="text-2xl font-bold text-[#3E2723] mt-1 font-['Playfair_Display']">{kpi.value}</div>
              {kpi.subtext && (
                <div className="text-[10px] text-[#8D6E63] mt-0.5">{kpi.subtext}</div>
              )}
              {kpi.action && (
                <button className={`mt-2 ${kpi.action.color} text-[#F5EDE0] text-xs font-medium px-3 py-1 rounded-full transition-colors`}>
                  {kpi.action.label}
                </button>
              )}
            </div>
          </AnimatedCard>
        )
      })}
    </div>
  )
}
