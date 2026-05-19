# Data Model: Analytics con Insights y Acción

**Feature**: 001-analytics-insights
**Date**: 2026-05-18

## Existing Entities (no schema changes needed)

### customers
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| phone | text | Celular (83% lleno) |
| email | text | 49% lleno |
| full_name | text | Nombre completo |
| created_at | timestamptz | Fecha de registro |
| restaurant_id | uuid | FK → restaurants |

### customer_stats
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| total_visits | integer | Número total de visitas |
| total_spent | numeric | Siempre $0 (POS no registró) |
| last_visit_date | date | Última visita |
| no_show_count | integer | Conteo de no-shows |
| is_recurring | boolean | Visitó más de 1 vez |
| loyalty_tier | text | Enum: none, new, occasional, regular, vip |
| updated_at | timestamptz | Última actualización |

### reservations
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| customer_id | uuid | FK → customers (nullable) |
| restaurant_id | uuid | FK |
| date | date | Fecha de la reserva |
| time | text | Hora (e.g. "19:30") |
| party_size | integer | Número de personas |
| status | text | confirmed, cancelled, no_show, completed, pre_paid |
| source | text | web, phone, whatsapp |
| special_requests | text | Notas especiales |
| created_at | timestamptz | Cuándo se creó |

### tables
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| capacity | integer | Número de asientos |
| zone_id | uuid | FK → table_zones |
| name | text | Nombre de la mesa |

## New API Response Shapes

### AnalyticsOverview (extended from existing)

```typescript
interface AnalyticsOverview {
  // Existing (keep)
  totalCustomers: number
  totalVisits: number
  totalNoShows: number
  totalSpent: number
  avgSpendPerVisit: number | null  // null when total_spent = $0
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

  // New fields
  reactivation: {
    dormantClients: number      // 1-visit clients
    reachableWhatsApp: number   // dormant with phone + opt-in
    reachableEmail: number      // dormant with email
    notReachable: number       // dormant without contact
  }
}
```

### NoShowTodayAlert

```typescript
interface NoShowTodayAlert {
  id: string
  customerName: string
  customerPhone: string | null
  reservationTime: string
  partySize: number
  noShowCount: number
  riskLevel: 'low' | 'medium' | 'high'
  tableZone: string | null
}
```

### WeeklyTrend

```typescript
interface WeeklyTrend {
  week: string          // ISO week: '2026-W20'
  label: string         // Display: 'May 12-18'
  activeCount: number   // Clients with visit that week
  newCount: number      // New clients that week
  noShowCount: number  // No-shows that week
  reservationCount: number
  retentionPct: number // recurring / total clients at that point
}
```

### TableDemandComparison

```typescript
interface TableDemandComparison {
  demand: {
    size2: number    // % of reservations for 2 people
    size4: number    // % for 3-4
    size6: number    // % for 5-6
    size8plus: number // % for 7+
  }
  supply: {
    size2: number    // % of tables with capacity 2
    size4: number    // % with capacity 3-4
    size6: number    // % with capacity 5-6
    size8plus: number // % with capacity 7+
  }
}
```

### VIPInactive

```typescript
interface VIPInactive {
  id: string
  customerName: string
  phone: string | null
  lastVisitDate: string | null
  totalVisits: number
  daysSinceLastVisit: number
  loyaltyTier: string
}
```

### CampaignMessage

```typescript
interface CampaignMessage {
  segment: 'dormant' | 'occasional' | 'vip_inactive' | 'all'
  channel: 'whatsapp' | 'email'
  audience: number      // Number of reachable clients
  template: string      // Pre-written message with placeholders
  placeholders: string[] // Available variables: {name}, {last_visit}, etc.
}
```

## State Transitions

### Reservation Status (existing, no changes)

```
confirmed → completed | cancelled | no_show
confirmed → pre_paid (when paid in advance)
```

### Loyalty Tier Progression (existing, no changes)

```
none → new (1 visit)
new → occasional (2-3 visits)
occasional → regular (4-5 visits)
regular → vip (6+ visits)
```