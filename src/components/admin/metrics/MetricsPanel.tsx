'use client'

import { useAdminMetrics } from '@/lib/hooks/useAdminMetrics'
import { AnimatedCard } from '../shared/AnimatedCard'
import { PeakHoursChart } from './PeakHoursChart'
import { SourceBreakdown } from './SourceBreakdown'
import { ConversionCard } from './ConversionCard'
import { NoShowCard } from './NoShowCard'
import { PartySizeCard } from './PartySizeCard'
import { DailyTrendChart } from './DailyTrendChart'
import { Spinner } from '@phosphor-icons/react'

export function MetricsPanel() {
  const { data, loading, error } = useAdminMetrics()

  if (loading && !data) return <div className="py-16 flex items-center justify-center"><Spinner size={32} className="animate-spin text-[var(--text-secondary)]" /></div>
  if (error) return <div className="py-16 text-center"><p className="text-sm text-[var(--color-danger)]">{error}</p></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard delay={0} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]"><ConversionCard pending={data.conversion.pending} confirmed={data.conversion.confirmed} rate={data.conversionRate} /></AnimatedCard>
        <AnimatedCard delay={0.06} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]"><NoShowCard total={data.noShow.total} noShows={data.noShow.no_shows} rate={data.noShowRate} /></AnimatedCard>
        <AnimatedCard delay={0.12} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]"><PartySizeCard average={data.avgPartySize} /></AnimatedCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatedCard delay={0.18} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5"><PeakHoursChart hours={data.peakHours} totalCapacity={data.totalCapacity} /></AnimatedCard>
        <AnimatedCard delay={0.24} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5"><SourceBreakdown sources={data.bySource} /></AnimatedCard>
      </div>
      <AnimatedCard delay={0.3} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-5"><DailyTrendChart trend={data.dailyTrend} /></AnimatedCard>
    </div>
  )
}