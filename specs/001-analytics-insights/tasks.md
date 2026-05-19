# Tasks: Analytics con Insights y Acción

**Input**: Design documents from `/specs/001-analytics-insights/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Tests**: Not explicitly requested — test tasks excluded.
**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Exact file paths included

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create hooks/types shared across all stories

- [ ] T001 Install Recharts dependency in /mnt/f/attick-keller/web/ (`npm install recharts`)
- [ ] T002 [P] Create TypeScript interfaces for new API response shapes in src/lib/types/analytics.ts — AnalyticsOverview extended (with reactivation), NoShowTodayAlert, WeeklyTrend, TableDemandComparison, VIPInactive, CampaignMessage
- [ ] T003 [P] Create useNoShowToday hook in src/lib/hooks/useNoShowToday.ts — fetches /api/admin/customers/analytics/no-show-today
- [ ] T004 [P] Create useWeeklyTrends hook in src/lib/hooks/useWeeklyTrends.ts — fetches /api/admin/customers/analytics/trends?weeks=8
- [ ] T005 [P] Create useTableDemand hook in src/lib/hooks/useTableDemand.ts — fetches /api/admin/customers/analytics/table-demand
- [ ] T006 [P] Create useVIPInactive hook in src/lib/hooks/useVIPInactive.ts — fetches /api/admin/customers/analytics/vip-inactive?days=30

**Checkpoint**: Dependencies installed, all types and hooks created

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend existing analytics API to serve reactivation data — all other stories depend on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Extend GET /api/admin/customers/analytics route in src/app/api/admin/customers/analytics/route.ts — add reactivation object to response: count dormant clients (1 visit), those reachable via WhatsApp (phone + email with opt-in), email-only, and not reachable. Uses count queries, no schema changes.
- [ ] T008 Extend useCustomerAnalytics hook in src/lib/hooks/useCustomerAnalytics.ts — add reactivation field to the interface and destructure it from API response

**Checkpoint**: Analytics API now returns reactivation data. All stories can begin.

---

## Phase 3: User Story 1 - Ver Estado en 30 Segundos (Priority: P1) 🎯 MVP

**Goal**: Admin sees KPIs, retention funnel with CTA, and contact quality in 30 seconds
**Independent Test**: Open /admin → Analytics tab, verify KPIs show correct totals (not truncated to 1000), retention funnel shows "90% fuga" with action CTA, no-show risk shows count with link

### Implementation for User Story 1

- [ ] T009 [US1] Update KPIStatsBar in src/components/admin/customers/KPIStatsBar.tsx — show "Dato no disponible" when avgSpendPerVisit is null/0, add tooltips explaining each KPI, ensure all 20K+ records are reflected
- [ ] T010 [US1] Add reactivation CTA to RetentionFunnel in src/components/admin/customers/RetentionFunnel.tsx — if oneTime segment > 50%, show amber alert "90% fuga — Campaign de reactivación → X alcanzables por WhatsApp" with link/CTA. Accept reactivation prop from parent.
- [ ] T011 [US1] Add "Ver reservas de riesgo" link to NoShowRiskCard in src/components/admin/customers/NoShowRiskCard.tsx — if highRisk > 0, show red alert with count and CTA button "Ver reservas de riesgo hoy" that scrolls to or opens NoShowAlertCard
- [ ] T012 [US1] Update CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — pass reactivation data to RetentionFunnel, wire new props to NoShowRiskCard, ensure layout is scannable (KPIs top, funnels middle, actions bottom)

**Checkpoint**: US1 complete — admin can see full dashboard with action CTAs in under 30 seconds

---

## Phase 4: User Story 2 - Reactivar Clientes Dormidos (Priority: P1) 🎯 MVP

**Goal**: See how many dormant clients are reachable via WhatsApp, with CTA to create campaign
**Independent Test**: See ReactivationCard showing e.g. "16,000 alcanzables por WhatsApp", click CTA opens CampaignModal with pre-filled WhatsApp message

### Implementation for User Story 2

- [ ] T013 [US2] Create ReactivationCard component in src/components/admin/customers/ReactivationCard.tsx — shows: dormant clients count, reachable by WhatsApp, reachable by email, not reachable. Prominent CTA button "Crear campaña de reactivación" when reachableWhatsApp > 0. Uses amber/borgoña design tokens.
- [ ] T014 [US2] Create CampaignModal component in src/components/admin/customers/CampaignModal.tsx — modal with: segment selector (dormant, occasional, vip_inactive), channel selector (WhatsApp, email), audience count from API, editable message template with placeholders ({name}, {last_visit}), "Copiar mensaje" button (clipboard), note that v1 is manual sending. POST /api/admin/campaigns on generate.
- [ ] T015 [US2] Create POST /api/admin/campaigns route in src/app/api/admin/campaigns/route.ts — accepts segment, channel, template. Returns formatted message with placeholders documented, audience count, and status "template_ready". No actual sending in v1.
- [ ] T016 [US2] Add ReactivationCard to CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — place below RetentionFunnel, wire reactivation data from analytics hook, wire CampaignModal open/close state

**Checkpoint**: US2 complete — admin can see reactivation opportunity and generate a WhatsApp campaign template

---

## Phase 5: User Story 3 - Alertas No-Show para Hoy (Priority: P1) 🎯 MVP

**Goal**: See today's high-risk reservations at a glance, with WhatsApp confirm button
**Independent Test**: Open dashboard on a day with confirmed reservations → see NoShowAlertCard listing risky reservations with customer name, time, risk level, and "Confirmar por WhatsApp" button

### Implementation for User Story 3

- [ ] T017 [US3] Create GET /api/admin/customers/analytics/no-show-today route in src/app/api/admin/customers/analytics/no-show-today/route.ts — query reservations for today with status='confirmed', join customer_stats for no_show_count, return array of alerts with risk level classification. Accept optional ?date= parameter.
- [ ] T018 [US3] Create NoShowAlertCard component in src/components/admin/customers/NoShowAlertCard.tsx — shows today's date, total reservations, at-risk count. For each alert: customer name, time, party size, risk badge (low/medium/high), phone link. "Confirmar por WhatsApp" button opens wa.me link with pre-filled message. Green "Sin alertas" state when no risks.
- [ ] T019 [US3] Add NoShowAlertCard + useNoShowToday to CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — place above funnels or in a prominent position. Wire data from useNoShowToday hook.

**Checkpoint**: US3 complete — admin sees high-risk reservations today with one-click WhatsApp confirm

---

## Phase 6: User Story 4 - Tendencias Semanales (Priority: P2)

**Goal**: See evolution of active clients, retention, and no-shows over 8 weeks
**Independent Test**: See line chart with weekly data points for activeCount, newCount, noShowCount

### Implementation for User Story 4

- [ ] T020 [US4] Create GET /api/admin/customers/analytics/trends route in src/app/api/admin/customers/analytics/trends/route.ts — query reservations grouped by ISO week for last N weeks, calculate activeCount, newCount, noShowCount, reservationCount, retentionPct per week. Accept ?weeks= parameter (default 8).
- [ ] T021 [US4] Create TrendChart component in src/components/admin/customers/TrendChart.tsx — Recharts LineChart with 3 lines: active clients (borgoña), new clients (oliva), no-shows (ámbar). Responsive, weekly labels, tooltips showing exact values. Uses design system colors.
- [ ] T022 [US4] Add TrendChart + useWeeklyTrends to CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — place below KPIs and cards, full width

**Checkpoint**: US4 complete — admin can see weekly trend evolution

---

## Phase 7: User Story 5 - Optimizar Distribución de Mesas (Priority: P2)

**Goal**: Compare demand by party size vs table availability, see mismatch recommendation
**Independent Test**: See bar chart comparing demand distribution vs supply distribution with clear mismatch indicator

### Implementation for User Story 5

- [ ] T023 [US5] Create GET /api/admin/customers/analytics/table-demand route in src/app/api/admin/customers/analytics/table-demand/route.ts — count reservations by party_size buckets (2, 3-4, 5-6, 7+) as demand%, count tables by capacity buckets as supply%, generate recommendation string if mismatch > 20%
- [ ] T024 [US5] Create TableDemandCard component in src/components/admin/customers/TableDemandCard.tsx — side-by-side bar chart (Recharts BarChart): demand vs supply for each size bucket. Highlight biggest mismatch in ámbar/red. Show recommendation text below.
- [ ] T025 [US5] Add TableDemandCard + useTableDemand to CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — place below TrendChart

**Checkpoint**: US5 complete — admin sees demand vs supply mismatch and table optimization recommendation

---

## Phase 8: User Story 6 - VIPs Inactivos y Fechas Especiales (Priority: P3)

**Goal**: Alert when VIPs haven't visited in 30+ days, show upcoming special dates with audience
**Independent Test**: See VIPAlertCard listing inactive VIPs with personal contact suggestion, and special dates with reachable audience count

### Implementation for User Story 6

- [ ] T026 [US6] Create GET /api/admin/customers/analytics/vip-inactive route in src/app/api/admin/customers/analytics/vip-inactive/route.ts — query customer_stats WHERE loyalty_tier='vip' AND last_visit_date < now()-30d, join customers for name and phone, return sorted by daysSinceLastVisit desc. Accept ?days= parameter (default 30).
- [ ] T027 [US6] Create VIPAlertCard component in src/components/admin/customers/VIPAlertCard.tsx — two sections: (1) VIP inactive list with name, last visit, total visits, phone link, "Contactar" CTA. (2) Upcoming special dates with hardcoded dates (Navidad, San Valentín, Día de la Madre, etc.) and calculated audience from reactivation data. Uses wood/borgoña design tokens.
- [ ] T028 [US6] Add VIPAlertCard + useVIPInactive to CustomerAnalyticsPanel in src/components/admin/customers/CustomerAnalyticsPanel.tsx — place after TableDemandCard

**Checkpoint**: US6 complete — admin sees inactive VIPs and special date opportunities

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Responsive, accessible, and consistent across all stories

- [ ] T029 [P] Make CustomerAnalyticsPanel responsive for mobile in src/components/admin/customers/CustomerAnalyticsPanel.tsx — grid changes to single column on small screens, touch-friendly cards, scrollable tables
- [ ] T030 [P] Add loading skeleton states to all new components — NoShowAlertCard, ReactivationCard, TrendChart, TableDemandCard, VIPAlertCard, CampaignModal each show skeleton while data loads
- [ ] T031 [P] Add error states to all new hooks — useNoShowToday, useWeeklyTrends, useTableDemand, useVIPInactive each handle fetch errors with user-friendly messages
- [ ] T032 Verify all data renders correctly with 20K+ records (no truncation to 1000) — manual check each component shows full counts
- [ ] T033 Verify avgSpendPerVisit shows "Dato no disponible" when total_spent is $0 — manual check KPIStatsBar
- [ ] T034 Run `npx next build` and verify no TypeScript or build errors
- [ ] T035 Push to git and verify Vercel deployment succeeds at https://web-rosy-nine-64.vercel.app/admin

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — extends existing components
- **US2 (Phase 4)**: Depends on Foundational — new components + campaign API
- **US3 (Phase 5)**: Depends on Foundational — new API route + new component
- **US4 (Phase 6)**: Depends on Foundational — new API route + Recharts
- **US5 (Phase 7)**: Depends on Foundational — new API route + new component
- **US6 (Phase 8)**: Depends on Foundational — new API route + new component
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: Can start after Foundational — extends existing components only
- **US2**: Can start after Foundational — new ReactivationCard + CampaignModal
- **US3**: Can start after Foundational — independent new route + component
- **US4**: Can start after Foundational — needs Recharts from Setup
- **US5**: Can start after Foundational — independent new route + component
- **US6**: Can start after Foundational — independent new route + component

### Within Each User Story

- API routes before hooks
- Hooks before components
- Components before panel integration

### Parallel Opportunities

- T002, T003, T004, T005, T006 can all run in parallel (different files)
- Once Foundational done: US1, US2, US3, US4, US5, US6 can all be developed in parallel by different agents
- Within US2: T013, T014, T015 can be partially parallelized (different files)
- Within US3: T017 (API) before T018 (component), but T018 and T019 are sequential
- Polish tasks T029-T031 can all run in parallel

---

## Parallel Example: After Foundational Phase

```bash
# Agent A: US1 (extend existing)
Task: "T009-T012: Update KPIs, RetentionFunnel, NoShowRiskCard, CustomerAnalyticsPanel"

# Agent B: US2 (reactivation)
Task: "T013-T016: Create ReactivationCard, CampaignModal, campaigns API, integrate"

# Agent C: US3 (no-show alerts)
Task: "T017-T019: Create no-show-today API, NoShowAlertCard, integrate"

# Agent D: US4+US5 (trends + demand)
Task: "T020-T025: Create trends API, TrendChart, table-demand API, TableDemandCard"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T008)
3. Complete Phase 3: US1 — KPIs + action CTAs (T009-T012)
4. Complete Phase 4: US2 — Reactivation + campaigns (T013-T016)
5. Complete Phase 5: US3 — No-show alerts (T017-T019)
6. **DEPLOY MVP** — Admin gets immediate value: 30s scan, reactivation CTA, no-show alerts

### Incremental Delivery

7. Phase 6: US4 — Weekly trends (T020-T022)
8. Phase 7: US5 — Table demand (T023-T025)
9. Phase 8: US6 — VIP alerts + special dates (T026-T028)
10. Phase 9: Polish (T029-T035)

### Estimated Effort

| Phase | Tasks | Description |
|-------|-------|-------------|
| Setup | T001-T006 (6) | Install deps, create types and hooks |
| Foundational | T007-T008 (2) | Extend analytics API with reactivation |
| US1 (P1) | T009-T012 (4) | KPI improvements + action CTAs |
| US2 (P1) | T013-T016 (4) | Reactivation + campaign modal |
| US3 (P1) | T017-T019 (3) | No-show alerts for today |
| US4 (P2) | T020-T022 (3) | Weekly trend chart |
| US5 (P2) | T023-T025 (3) | Table demand comparison |
| US6 (P3) | T026-T028 (3) | VIP inactive + special dates |
| Polish | T029-T035 (7) | Responsive, loading, error states, deploy |
| **Total** | **35 tasks** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- No database schema changes needed — all data comes from existing tables
- Campaign v1 is manual (copy/paste WhatsApp). WhatsApp Business API is v2 scope
- `avgSpendPerVisit` returns null when `total_spent = $0` — component shows "Dato no disponible"
- fetchAll() uses batches of 999 to avoid Supabase 1000-row limit
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently