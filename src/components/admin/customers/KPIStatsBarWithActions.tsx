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
          <div key={i} className="bg-[var(--bg-primary)] rounded-xl shadow-[var(--shadow-card)] border border-[var(--border-default)] p-4 animate-pulse">
            <div className="h-3 bg-[var(--border-default)] rounded w-2/3 mb-2"></div>
            <div className="h-6 bg-[var(--border-default)] rounded w-1/2"></div>
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
      iconColor: 'var(--color-accent)',
    },
    {
      icon: ArrowsClockwise,
      label: 'Recurrentes',
      value: overview.recurring.toLocaleString(),
      subtext: `${Math.round((overview.recurring / overview.totalCustomers) * 100)}%`,
      action: null,
      iconColor: 'var(--color-success)',
    },
    {
      icon: Calendar,
      label: 'Activos (30d)',
      value: overview.recent30.toLocaleString(),
      subtext: `${Math.round((overview.recent30 / overview.totalCustomers) * 100)}%`,
      action: null,
      iconColor: 'var(--color-warning)',
    },
    {
      icon: Fire,
      label: 'Dormidos',
      value: overview.reactivation?.dormantClients?.toLocaleString() || overview.retention.oneTime.toLocaleString(),
      subtext: `${overview.reactivation?.reachableWhatsApp?.toLocaleString() || '—'} por WhatsApp`,
      action: { label: 'Reactivar', color: 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/80' },
      iconColor: 'var(--color-ak-ladrillo)',
    },
    {
      icon: Warning,
      label: 'No-Show',
      value: overview.noShowRisk.highRisk.toString(),
      subtext: `${overview.noShowRisk.medRisk} medio + ${overview.noShowRisk.lowRisk} bajo`,
      action: { label: 'Ver alertas', color: 'bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/80' },
      iconColor: 'var(--color-warning)',
    },
    {
      icon: CurrencyDollar,
      label: 'Gasto/Visita',
      value: spendDisplay,
      subtext: undefined,
      action: null,
      iconColor: 'var(--color-ak-dorado)',
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
              <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{kpi.label}</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-[family-name:var(--font-heading)]">{kpi.value}</div>
              {kpi.subtext && (
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{kpi.subtext}</div>
              )}
              {kpi.action && (
                <button className={`mt-2 ${kpi.action.color} text-[var(--bg-primary)] text-xs font-medium px-3 py-1 rounded-full transition-colors`}>
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