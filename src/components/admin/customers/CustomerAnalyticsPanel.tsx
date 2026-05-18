'use client'

import { useCustomerAnalytics } from '@/lib/hooks/useCustomerAnalytics'
import { RetentionFunnel } from './RetentionFunnel'
import { NoShowRiskCard } from './NoShowRiskCard'
import { SegmentBreakdown } from './SegmentBreakdown'
import { ContactQualityCard } from './ContactQualityCard'
import { KPIStatsBar } from './KPIStatsBar'
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
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-[#8D6E63] mt-1">Verifica que la migración SQL esté aplicada</p>
      </div>
    )
  }

  if (!overview) return null

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <KPIStatsBar
        total={overview.totalCustomers}
        recurring={overview.recurring}
        recent30={overview.recent30}
        recent90={overview.recent90}
        avgSpendPerVisit={overview.avgSpendPerVisit}
        totalVisits={overview.totalVisits}
      />

      {/* Row 1: Retention + No-Show Risk */}
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

      {/* Row 2: Segments + Contact Quality */}
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
    </div>
  )
}