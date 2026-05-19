'use client'

import type { AnalyticsOverview } from '@/lib/hooks/useCustomerAnalytics'
import { AnimatedCard } from '../shared/AnimatedCard'

interface KPIStatsBarProps {
  overview: AnalyticsOverview | null
  loading: boolean
}

export function KPIStatsBarWithActions({ overview, loading }: KPIStatsBarProps) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 animate-pulse">
            <div className="h-3 bg-stone-200 rounded w-2/3 mb-2"></div>
            <div className="h-6 bg-stone-200 rounded w-1/2"></div>
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
      action: { label: 'Reactivar', color: 'bg-green-600' },
    },
    {
      icon: '⚠️',
      label: 'No-Show',
      value: overview.noShowRisk.highRisk.toString(),
      subtext: `${overview.noShowRisk.medRisk} medio + ${overview.noShowRisk.lowRisk} bajo`,
      action: { label: 'Ver alertas', color: 'bg-amber-600' },
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
            <div className="text-xs text-stone-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{kpi.value}</div>
            {kpi.subtext && (
              <div className="text-xs text-stone-400 mt-0.5">{kpi.subtext}</div>
            )}
            {kpi.action && (
              <button className={`mt-2 ${kpi.action.color} hover:opacity-90 text-white text-xs font-medium px-3 py-1 rounded-full transition-opacity`}>
                {kpi.action.label}
              </button>
            )}
          </div>
        </AnimatedCard>
      ))}
    </div>
  )
}