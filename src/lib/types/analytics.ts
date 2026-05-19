// Analytics types for 001-analytics-insights feature
// Based on specs/001-analytics-insights/data-model.md

export interface ReactivationData {
  dormantClients: number
  reachableWhatsApp: number
  reachableEmail: number
  notReachable: number
}

export interface NoShowTodayAlert {
  id: string
  customerName: string
  customerPhone: string | null
  reservationTime: string
  partySize: number
  noShowCount: number
  riskLevel: 'low' | 'medium' | 'high'
  tableZone: string | null
}

export interface NoShowTodayResponse {
  date: string
  alerts: NoShowTodayAlert[]
  totalAtRisk: number
  totalReservationsToday: number
}

export interface WeeklyTrend {
  week: string        // ISO week: '2026-W20'
  label: string       // Display: 'May 12-18'
  activeCount: number // Clients with visit that week
  newCount: number    // New clients that week
  noShowCount: number // No-shows that week
  reservationCount: number
  retentionPct: number // recurring / total
}

export interface TrendResponse {
  trends: WeeklyTrend[]
}

export interface TableDemandComparison {
  demand: {
    size2: number
    size4: number
    size6: number
    size8plus: number
  }
  supply: {
    size2: number
    size4: number
    size6: number
    size8plus: number
  }
  mismatch: boolean
  recommendation: string
}

export interface VIPInactive {
  id: string
  customerName: string
  phone: string | null
  lastVisitDate: string | null
  totalVisits: number
  daysSinceLastVisit: number
  loyaltyTier: string
}

export interface VIPInactiveResponse {
  vipInactive: VIPInactive[]
  count: number
  totalVIPs: number
}

export interface CampaignRequest {
  segment: 'dormant' | 'occasional' | 'vip_inactive' | 'all'
  channel: 'whatsapp' | 'email'
  template: string
}

export interface CampaignResponse {
  segment: string
  channel: string
  audience: number
  message: string
  note: string
  status: 'template_ready'
}