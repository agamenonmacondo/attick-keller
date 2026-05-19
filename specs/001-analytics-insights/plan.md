# Implementation Plan: Analytics con Insights y Acción

**Branch**: `001-analytics-insights` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-analytics-insights/spec.md`

## Summary

Transformar el dashboard de Analytics de Attick & Keller de un observatorio pasivo a un cerebro operativo. Actualmente muestra datos (KPIs, embudo, segmentos) pero no sugiere acciones. El feature agrega: tarjeta de reactivación con CTA de campaña WhatsApp, alertas de no-show para reservas de hoy, tendencias semanales, demanda-vs-mesas, y VIPs inactivos. Todo con acciones sugeridas por cada insight.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router)

**Primary Dependencies**: React 19, Supabase JS Client, Tailwind v4, Phosphor Icons, Framer Motion

**Storage**: Supabase PostgreSQL (tables: customers, customer_stats, reservations, tables, table_zones, table_combinations)

**Testing**: Manual verification against 20,413 real customer records + 363 mock reservations

**Target Platform**: Vercel serverless (Hobby plan, 10s timeout)

**Project Type**: Web application (Next.js App Router with admin dashboard)

**Performance Goals**: Dashboard loads < 5s with 20K+ records. Admin scans in 30s.

**Constraints**: 
- Supabase REST API max 1000 rows/request → fetchAll() with batches of 999
- No DDL via API → manual Supabase Dashboard for schema changes
- Vercel Hobby 10s timeout → prefer count queries over fetchAll where possible
- total_spent = $0 for all records → show "No disponible" instead of $0

**Scale/Scope**: 20,413 customers, 363+ reservations, 45 tables, 5 zones, single restaurant

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Insights con Acción | ✅ PASS | Each card has CTA (campaign, confirm, contact) |
| 2. Datos Reales | ✅ PASS | Uses 20,413 real records, count queries for accuracy |
| 3. WhatsApp como Canal Principal | ✅ PASS | Reactivation card prioritizes WhatsApp reach |
| 4. El Admin No Tiene Tiempo | ✅ PASS | 30-second scan: KPIs top, actions bottom-right |
| 5. Retención > Adquisición | ✅ PASS | Reactivation (P1) before campaigns for new clients |
| 6. No-Show = Dinero Perdido | ✅ PASS | No-show alerts (P1) with WhatsApp confirm CTA |
| 7. Progreso Verificable | ✅ PASS | Weekly trend chart (P2) measures campaign impact |
| Tech: fetchAll batches 999 | ✅ PASS | API uses count queries + fetchAll(999) |
| Tech: No DDL via API | ✅ PASS | No schema changes needed |
| Tech: No nonexistent columns | ✅ PASS | Only: id, customer_id, total_visits, total_spent, last_visit_date, no_show_count, is_recurring, loyalty_tier, updated_at |
| Code: TypeScript strict | ✅ PASS | All components typed |
| Code: Tailwind colors | ✅ PASS | Uses design system palette |

**Gate Result**: ✅ ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-analytics-insights/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── analytics-api.md # API contract for new endpoints
└── checklists/
    └── requirements.md  # Spec quality checklist (completed)
```

### Source Code (repository root)

```text
src/
├── app/api/admin/customers/analytics/
│   └── route.ts                    # EXISTING - modify to add reactivation, no-show-today, trends, demand
├── app/api/admin/customers/analytics/
│   └── no-show-today/route.ts      # NEW - reservations at risk today
├── app/api/admin/campaigns/
│   └── route.ts                    # NEW - campaign launcher (v1: generate WhatsApp message)
├── components/admin/customers/
│   ├── CustomerAnalyticsPanel.tsx   # EXISTING - modify to add new cards
│   ├── KPIStatsBar.tsx             # EXISTING - keep as-is
│   ├── RetentionFunnel.tsx         # EXISTING - add reactivation CTA
│   ├── NoShowRiskCard.tsx          # EXISTING - add "ver reservas de riesgo" link
│   ├── ReactivationCard.tsx        # NEW - dormant clients + WhatsApp reach + CTA
│   ├── NoShowAlertCard.tsx         # NEW - today's risky reservations + confirm button
│   ├── TrendChart.tsx              # NEW - weekly trends (retention, no-show, active)
│   ├── TableDemandCard.tsx         # NEW - demand vs table availability
│   ├── VIPAlertCard.tsx            # NEW - inactive VIPs + special dates
│   └── CampaignModal.tsx           # NEW - compose WhatsApp campaign message
├── lib/hooks/
│   ├── useCustomerAnalytics.ts      # EXISTING - extend with new data
│   ├── useNoShowToday.ts           # NEW - hook for today's risky reservations
│   └── useWeeklyTrends.ts          # NEW - hook for trend data
└── lib/utils/
    └── admin-auth.ts               # EXISTING - keep as-is
```

**Structure Decision**: Single project (Next.js App Router). New components extend existing `components/admin/customers/` structure. New API routes extend existing `app/api/admin/` structure.