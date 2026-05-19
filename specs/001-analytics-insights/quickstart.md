# Quickstart: Analytics con Insights y Acción

**Feature**: 001-analytics-insights
**Date**: 2026-05-18

## Prerequisites

- Node.js 18+
- Supabase project with 20,413+ customers and customer_stats
- Admin session (auth cookie)

## New API Endpoints

```bash
# Existing (extended with reactivation data)
GET /api/admin/customers/analytics

# New endpoints
GET /api/admin/customers/analytics/no-show-today?date=2026-05-18
GET /api/admin/customers/analytics/trends?weeks=8
GET /api/admin/customers/analytics/table-demand
GET /api/admin/customers/analytics/vip-inactive?days=30
POST /api/admin/campaigns
```

## New Frontend Components

```tsx
// Add to CustomerAnalyticsPanel.tsx
import { ReactivationCard } from './ReactivationCard'
import { NoShowAlertCard } from './NoShowAlertCard'
import { TrendChart } from './TrendChart'
import { TableDemandCard } from './TableDemandCard'
import { VIPAlertCard } from './VIPAlertCard'
```

## Key Design Decisions

1. **avgSpendPerVisit = null when total_spent = $0** — show "Dato no disponible" instead of "$0"
2. **Campaign v1 = manual WhatsApp** — generates template, admin copies and sends
3. **Trends use reservation weeks** — no snapshot table needed
4. **fetchAll(999)** for customer_stats, count queries for contacts
5. **Recharts for TrendChart** — lightweight, Tailwind-compatible

## Database Changes

**NONE** — No schema changes required. All data exists in current tables.

## Run Locally

```bash
cd web
npm run dev
# Navigate to /admin → Clients → Analytics tab
```