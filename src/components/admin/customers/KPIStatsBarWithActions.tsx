'use client'

import type { AnalyticsOverview } from '@/lib/hooks/useCustomerAnalytics'
import { AnimatedCard } from '../shared/AnimatedCard'

interface KPIStatsBarWithActionsProps {
  overview: AnalyticsOverview | null
  loading: boolean
}

export function KPIStatsBarWithActions({ overview, loading }: KPIStatsBarWithActionsProps) {
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
  const spendDisplay = avgSpend === 0 ? '—' : `$${avgSpend.toLocaleString()}`

  const kpis = [
    {
      icon: '👥',
      label: 'Total Clientes',
      value: overview.totalCustomers.toLocaleString(),
      action: null,
    },
    {
      icon: '🔄',
      label: 'Recurrentes',
      value: overview.recurring.toLocaleString(),
      subtext: `${Math.round((overview.recurring / overview.totalCustomers) * 100)}%`,
      action: null,
    },
    {
      icon: '📅',
      label: 'Activos (30d)',
      value: overview.recent30.toLocaleString(),
      subtext: `${Math.round((overview.recent30 / overview.totalCustomers) * 100)}%`,
      action: null,
    },
    {
      icon: '🔥',
      label: 'Dormidos',
      value: overview.reactivation?.dormantClients?.toLocaleString() || overview.retention.oneTime.toLocaleString(),
      subtext: `${overview.reactivation?.reachableWhatsApp?.toLocaleString() || '—'} por WhatsApp`,
      action: { label: 'Reactivar', href: '#reactivation' },
    },
    {
      icon: '⚠️',
      label: 'No-Show',
      value: overview.noShowRisk.highRisk.toString(),
      subtext: `${overview.noShowRisk.medRisk} medio + ${overview.noShowRisk.lowRisk} bajo`,
      action: { label: 'Ver alertas', href: '#no-show-alerts' },
    },
    {
      icon: '💰',
      label: 'Gasto/Visita',
      value: spendDisplay,
      action: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, i) => (
        <AnimatedCard key={i} delay={i * 0.05}>
          <div className="p-4 text-center">
            <div className="text-lg mb-1">{kpi.icon}</div>
            <div className="text-[10px] text-[#8D6E63] uppercase tracking-wider font-medium">{kpi.label}</div>
            <div className="text-2xl font-bold text-[#3E2723] mt-1 font-['Playfair_Display']">{kpi.value}</div>
            {kpi.subtext && (
              <div className="text-xs text-[#8D6E63] mt-0.5">{kpi.subtext}</div>
            )}
            {kpi.action && (
              <a
                href={kpi.action.href}
                className="mt-2 inline-block bg-[#6B2737] hover:bg-[#3E2723] text-white text-[10px] font-semibold px-3 py-1 rounded-full transition-colors"
              >
                {kpi.action.label}
              </a>
            )}
          </div>
        </AnimatedCard>
      ))}
    </div>
  )
}