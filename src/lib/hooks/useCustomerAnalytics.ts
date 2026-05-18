'use client'

import { useState, useEffect, useCallback } from 'react'

interface AnalyticsOverview {
  totalCustomers: number
  totalVisits: number
  totalNoShows: number
  totalSpent: number
  avgSpendPerVisit: number
  recurring: number
  withPhone: number
  withEmail: number
  withBoth: number
  withNeither: number
  recent30: number
  recent90: number
  segments: Record<string, number>
  retention: {
    oneTime: number
    twoToThree: number
    fourToFive: number
    sixToTen: number
    vip: number
  }
  noShowRisk: {
    noRisk: number
    lowRisk: number
    medRisk: number
    highRisk: number
  }
  highRiskClients: Array<{
    customer_id: string
    no_show_count: number
    total_visits: number
    loyalty_tier: string
  }>
  vipClients: Array<{
    customer_id: string
    total_visits: number
    no_show_count: number
    loyalty_tier: string
  }>
}

interface RetentionData {
  visitCounts: Record<number, number>
  monthlyActive: Record<string, number>
  total: number
}

export function useCustomerAnalytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [retention, setRetention] = useState<RetentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/customers/analytics?view=overview')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRetention = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customers/analytics?view=retention')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setRetention(data)
    } catch (err) {
      console.error('[useCustomerAnalytics] Retention error:', err)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
    fetchRetention()
  }, [fetchOverview, fetchRetention])

  return { overview, retention, loading, error, refetch: fetchOverview }
}