'use client'

import { useCustomerAnalytics } from '@/lib/hooks/useCustomerAnalytics'
import { RetentionFunnel } from './RetentionFunnel'
import { NoShowRiskCard } from './NoShowRiskCard'
import { SegmentBreakdown } from './SegmentBreakdown'
import { ContactQualityCard } from './ContactQualityCard'
import { KPIStatsBarWithActions } from './KPIStatsBarWithActions'
import { ReactivationCard } from './ReactivationCard'
import { NoShowAlertCard } from './NoShowAlertCard'
import { TrendChart } from './TrendChart'
import { TableDemandCard } from './TableDemandCard'
import { VIPInactiveCard } from './VIPInactiveCard'
import { Spinner } from '@phosphor-icons/react'

export function CustomerAnalyticsPanel() {
  const { overview, loading, error } = useCustomerAnalytics()

  if (loading && !overview) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-[#8D6E63]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#C62828]">{error}</p>
        <p className="text-xs text-[#8D6E63] mt-1">Verifica que la migracion SQL este aplicada</p>
      </div>
    )
  }

  if (!overview) return null

  return (
    <div className="space-y-6">
      {/* KPI Bar with Action CTAs */}
      <KPIStatsBarWithActions overview={overview} loading={false} />

      {/* Row 1: Reactivation + No-Show Alerts (P1 actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overview.reactivation && (
          <ReactivationCard
            dormantClients={overview.reactivation.dormantClients}
            reachableWhatsApp={overview.reactivation.reachableWhatsApp}
            reachableEmail={overview.reactivation.reachableEmail}
            notReachable={overview.reactivation.notReachable}
          />
        )}
        <NoShowAlertCard />
      </div>

      {/* Row 2: Retention + No-Show Risk (existing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RetentionFunnel
          retention={overview.retention}
          total={overview.totalCustomers}
        />
        <NoShowRiskCard
          risk={overview.noShowRisk}
          totalNoShows={overview.totalNoShows}
          totalClients={overview.totalCustomers}
        />
      </div>

      {/* Row 3: Trends + Table Demand (P2 insights) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart />
        <TableDemandCard />
      </div>

      {/* Row 4: Segments + Contact Quality (existing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SegmentBreakdown
          segments={overview.segments}
          total={overview.totalCustomers}
        />
        <ContactQualityCard
          withPhone={overview.withPhone}
          withEmail={overview.withEmail}
          withBoth={overview.withBoth}
          withNeither={overview.withNeither}
          total={overview.totalCustomers}
        />
      </div>

      {/* Row 5: VIP Inactive (P3) */}
      <VIPInactiveCard />
    </div>
  )
}
