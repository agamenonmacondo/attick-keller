# Attick & Keller — Complete Code Map

> **Auto-generated reference** — May 2026  
> Stack: Next.js 15 App Router · Supabase (Auth + DB) · Tailwind CSS · Phosphor Icons · Framer Motion · Recharts  
> Project root: `/mnt/f/attick-keller/web/src/`  
> 277 TypeScript/TSX files scanned

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pages & Routing](#2-pages--routing)
3. [Middleware & Auth](#3-middleware--auth)
4. [API Routes](#4-api-routes)
5. [Hooks](#5-hooks)
6. [Admin Components (by Domain)](#6-admin-components-by-domain)
7. [Host Components](#7-host-components)
8. [Public Components](#8-public-components)
9. [Algorithm Modules](#9-algorithm-modules)
10. [Utility Libraries](#10-utility-libraries)
11. [Type Definitions](#11-type-definitions)
12. [Supabase Configuration](#12-supabase-configuration)
13. [Email System](#13-email-system)
14. [Database Tables Referenced](#14-database-tables-referenced)
15. [Environment Variables](#15-environment-variables)

---

## 1. Architecture Overview

```
src/
├── app/                          # Next.js App Router pages & API routes
│   ├── page.tsx                  # Public homepage
│   ├── layout.tsx                # Root layout (fonts, AuthProvider, ThemeProvider)
│   ├── admin/                    # Admin dashboard (role: store_admin / super_admin)
│   ├── host/                     # Host stand (role: host)
│   ├── mi-turno/                 # Employee self-service (role: lider_area / colaborador)
│   ├── perfil/                   # User profile (role: authenticated)
│   ├── reservar/                 # Public reservation flow
│   ├── auth/                     # Login / Signup / Callback / Redirect
│   └── api/                      # API route handlers
│       ├── auth/                 # Auth helpers (signup confirm, role lookup)
│       ├── availability/        # Public table availability checker
│       ├── menu/                 # Public menu data
│       ├── reservations/         # Customer-facing reservation CRUD
│       ├── zones/                # Public zone listing
│       └── admin/                # Admin-only API (see §4)
├── components/
│   ├── admin/                    # Admin panel components (domain-organized)
│   │   ├── reservations/
│   │   ├── occupancy/
│   │   ├── metrics/
│   │   ├── pos-dashboard/
│   │   ├── customers/
│   │   ├── menu/
│   │   ├── team/
│   │   ├── inventory/ (tables/zones/combos)
│   │   ├── floorplan/
│   │   ├── nomina/
│   │   ├── rodri/
│   │   ├── shifts/
│   │   └── shared/              # Reusable UI: AnimatedCard, ConfirmDialog, SectionHeading, Spinner wrappers
│   ├── host/                     # Host-stand components
│   └── (public)                  # Navbar, Footer, HeroSection, MenuSection, PhotoCTA
├── lib/
│   ├── algorithms/               # Table assignment engine
│   ├── auth/                     # AuthProvider + useAuth hook
│   ├── email/                    # Resend-based email sender
│   ├── hooks/                    # 27 data-fetching hooks
│   ├── supabase/                 # Browser, server, and "rodri" Supabase clients
│   ├── types/                    # TypeScript interfaces (shifts, inventory, analytics)
│   └── utils/                    # Formatting, constants, cost calculator, etc.
├── middleware.ts                 # Route protection by role
└── test/                         # Test directory
```

**Key Architectural Decisions:**
- All admin API routes use `getAdminUser()` or `getStaffUser()` for auth — never rely on RLS alone
- Service-role Supabase client (`getServiceClient()`) used in all server-side API routes to bypass RLS
- Client components fetch data via custom hooks → API routes → Supabase service client
- Colombian timezone (UTC-5) enforced via `getColombiaTime()` helper
- Role hierarchy: `super_admin` > `store_admin` > `host` > `lider_area` > `colaborador`

---

## 2. Pages & Routing

### Public Pages

| Route | File | Purpose | Key Components |
|-------|------|---------|----------------|
| `/` | `app/page.tsx` | Homepage | Navbar, HeroSection, MenuSection, PhotoCTA, Footer |
| `/reservar` | `app/reservar/page.tsx` | Reservation wizard (multi-step) | Custom reservation form |
| `/reservar/confirmado` | `app/reservar/confirmado/page.tsx` | Reservation confirmation | Confirmation details |
| `/menu` | (via Homepage) | Menu display | MenuSection component |
| `/auth/login` | `app/auth/login/page.tsx` | Login form | Supabase Auth |
| `/auth/signup` | `app/auth/signup/page.tsx` | Signup form + auto-confirm | Supabase Auth |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth code exchange | Sets Supabase session cookies |
| `/auth/redirect` | `app/auth/redirect/page.tsx` | Role-based post-login redirect | Reads role → routes to /admin, /host, /mi-turno, /perfil |

### Authenticated Pages

| Route | File | Required Role | Purpose | Key Components |
|-------|------|---------------|---------|----------------|
| `/admin` | `app/admin/page.tsx` | `store_admin`, `super_admin` | Admin dashboard | AdminShell (12 sub-tabs) |
| `/admin/layout.tsx` | `app/admin/layout.tsx` | same | Admin layout wrapper | AuthGuard + AdminShell |
| `/host` | `app/host/page.tsx` | `host` | Host stand | HostShell |
| `/host/layout.tsx` | `app/host/layout.tsx` | `host` | Host layout | AuthGuard |
| `/mi-turno` | `app/mi-turno/page.tsx` | `lider_area`, `colaborador` | Employee self-service | 4 sub-tabs (horario, checkin, novedad, horas) |
| `/perfil` | `app/perfil/page.tsx` | `authenticated` | User profile | Reservation history, settings |

### Root Layout (`app/layout.tsx`)
- Loads 3 Google Fonts: Playfair Display (headings), DM Sans (body), Caveat (accent)
- Wraps app in `<AuthProvider>` and `<ThemeProvider>`
- Defines CSS variables for brand colors: `--color-ak-madera`, `--color-ak-dorado`, `--color-ak-borgona`
- Supports light/dark mode via CSS variables

---

## 3. Middleware & Auth

### `middleware.ts` — Route Protection

```
/admin/*      → store_admin, super_admin
/host/*       → host (+ store_admin, super_admin for debugging)
/mi-turno/*   → lider_area, colaborador
/perfil/*     → authenticated (any logged-in user)
/reservar/*   → authenticated
```

**How it works:**
1. Reads Supabase session from cookies using `createServerClient`
2. Queries `user_roles` table for the user's active role
3. Redirects to `/auth/login` if not authorized

### `lib/auth/auth-provider.tsx` — Client-side Auth

- **`AuthProvider`** — Wraps app, provides Supabase SSR client via context
- **`useAuth()` hook** — Returns `{ user, role, loading, signOut }`
- On mount: reads session from Supabase, fetches role from `/api/auth/role`
- Role is cached in context to avoid redundant API calls

### `lib/utils/admin-auth.ts` — Server-side Auth Helpers

| Function | Purpose | Used By |
|----------|---------|---------|
| `getAdminUser(request)` | Validates admin session (super_admin / store_admin) | All `/api/admin/*` routes requiring admin |
| `getStaffUser(request)` | Validates staff session (includes host, lider_area, colaborador) | Some admin routes accessible by host |
| `getEmployeeUser(request)` | Validates employee session (lider_area, colaborador) | Shift checkin/checkout routes |
| `getServiceClient()` | Returns Supabase client with service-role key (bypasses RLS) | All admin API routes |
| `RESTAURANT_ID` | Constant: `'a0000000-0000-0000-0000-000000000001'` | Used everywhere |

---

## 4. API Routes

### 4.1 Public API Routes

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/auth` | POST | None | `auth.users` | Auto-confirms signup user |
| `/api/auth/role` | GET | Session cookie | `user_roles` | `{ role: string \| null }` |
| `/api/availability` | POST | Authenticated | `tables`, `table_zones`, `reservations`, `table_combinations` | Available time slots for date/party_size |
| `/api/menu` | GET | None | `menu_categories`, `menu_items` | Categories + items for public menu |
| `/api/reservations` | POST | Authenticated | `customers`, `reservations` | Creates customer reservation |
| `/api/reservations/[id]` | GET | Authenticated | `reservations`, `table_zones` (via REST API) | Single reservation details |
| `/api/zones` | GET | None | `table_zones` | Zone list for reservation form |

### 4.2 Admin API Routes

#### Dashboard & Reservations

| Endpoint | Method | Auth | Tables Queried | Purpose |
|----------|--------|------|-----------------|---------|
| `/api/admin/dashboard` | GET | Staff | `reservations`, `tables`, `table_zones`, `customers` | Day's dashboard: reservations + tables + zones |
| `/api/admin/reservations` | POST | Staff | `reservations`, `customers`, `tables` | Create reservation (walk-in / admin) |
| `/api/admin/reservations/[id]` | PATCH | Staff | `reservations`, `tables` | Update reservation status/fields with state machine |
| `/api/admin/dates-with-reservations` | GET | Admin | `reservations` | Dates with reservations for calendar highlighting |
| `/api/admin/table-suggestion` | POST | Staff | Tables + reservations | Run table-assignment algorithm for a reservation |
| `/api/admin/table-suggestion` | PUT | Staff | (logging) | Log suggestion correction (host override) |

**Reservation State Machine:** `pending → confirmed → seated → completed`  
Branches: `pending → cancelled`, `confirmed → cancelled / no_show`, `pre_paid → confirmed / no_show`  
`completed`, `cancelled`, `no_show` are terminal states.

#### Occupancy

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/occupancy` | GET | Staff | `tables`, `table_zones`, `reservations`, `customers`, `table_combinations` | Live occupancy map, urgency scores, multi-reservation table mapping |

#### Metrics

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/metrics` | GET | Admin | `reservations`, `tables` | 30-day metrics: peak hours, source breakdown, conversion rate, no-show rate, avg party size, daily trend |

#### Floor Plan

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/floorplan` | GET | Staff | `tables`, `table_zones`, `reservations`, `customers` | 2D floor plan data with reservation overlay, grouped by floor |

#### Inventory (Tables/Zones/Combinations)

| Endpoint | Method | Auth | Tables Queried | Purpose |
|----------|--------|------|-----------------|---------|
| `/api/admin/inventory/tables` | GET | Admin | `tables`, `table_zones` | List all tables with zone info |
| `/api/admin/inventory/tables` | POST | Admin | `tables` | Create new table |
| `/api/admin/inventory/tables/[id]` | PATCH | Admin | `tables` | Update table (number, capacity, zone, active, combine_group, etc.) |
| `/api/admin/inventory/zones` | GET | Admin | `table_zones` | List zones |
| `/api/admin/inventory/zones` | POST | Admin | `table_zones` | Create zone |
| `/api/admin/inventory/combinations` | GET | Admin | `table_combinations` | List table combinations |
| `/api/admin/inventory/combinations` | POST | Admin | `table_combinations` | Create combination |
| `/api/admin/zones` | GET | Admin | `table_zones` | Simple zone list for dropdowns |

#### Menu Management

| Endpoint | Method | Auth | Tables Queried | Purpose |
|----------|--------|------|-----------------|---------|
| `/api/admin/menu` | GET | Admin | `menu_categories`, `menu_items` | Full menu with categories + items |
| `/api/admin/menu/categories` | POST | Admin | `menu_categories` | Create category |
| `/api/admin/menu/categories/[id]` | PATCH | Admin | `menu_categories` | Update category |
| `/api/admin/menu/items` | POST | Admin | `menu_items` | Create menu item |
| `/api/admin/menu/items/[id]` | PATCH | Admin | `menu_items` | Update menu item |
| `/api/admin/menu/items/[id]/ingredients` | GET, POST, DELETE | Admin | `menu_item_ingredients`, `menu_items` | Manage dish ingredients |
| `/api/admin/menu/[id]/recipe` | GET | Admin | `menu_items`, `pos_products`, `pos_product_recipes`, `pos_ingredients` | Recipe/cost linked from POS |

#### Staff Management

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/staff` | GET | Admin | `user_roles`, `auth.users` | All staff with roles + emails |
| `/api/admin/staff` | POST | Admin | `user_roles` | Assign role to user by email |
| `/api/admin/staff/[id]` | PATCH | Admin | `user_roles` | Activate/deactivate staff role |
| `/api/admin/staff/[id]` | DELETE | Admin | `user_roles` | Remove staff role |
| `/api/admin/staff/list-employees` | GET | Admin | `pos_nomina_staff` | Employee dropdown data |

#### POS Dashboard (Revenue Analytics)

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/pos-dashboard` | GET | Admin | `pos_sales`, `pos_sale_items`, `pos_products`, `pos_product_groups`, `pos_areas`, `pos_staff`, `pos_sale_payments`, `pos_payment_methods` | KPIs: revenue, tips, party sizes, zone breakdown, hourly/daily stats, top products, category breakdown, staff performance, payment methods, shift reconciliation |
| `/api/admin/pos-dashboard/detail` | GET | Admin | Same + `pos_ingredients`, `pos_product_recipes` | Drill-down on specific metric (zone/category/hour/product) |
| `/api/admin/pos-calendar` | GET | Admin | `pos_sales` | Daily trend + available months for heatmap calendar |
| `/api/admin/pos-costs` | GET | Admin | `pos_purchases`, `pos_purchase_items`, `pos_ingredients` | Food cost analytics: COGS, ingredient costs, category breakdown |
| `/api/admin/pos-products` | GET | Admin | `pos_products`, `pos_product_groups` | POS product catalog with search/filter |
| `/api/admin/pos-products/[id]` | GET | Admin | `pos_products`, `pos_product_prices`, `pos_product_recipes`, `pos_ingredients` | Single product with price + recipe |
| `/api/admin/pos-upload` | POST | Admin | `pos_sales`, `pos_sale_items`, `pos_products`, `pos_product_groups`, `pos_staff`, `pos_areas`, `pos_sale_payments`, `pos_payment_methods` | Bulk upsert POS data from JSON export |
| `/api/admin/pos-ingredients` | GET | Admin | `pos_ingredients`, `pos_ingredient_categories` | Ingredient catalog with category filter |
| `/api/admin/pos-ingredient-categories` | GET | Admin | `pos_ingredient_categories`, `pos_ingredients` | Ingredient categories with counts |
| `/api/admin/pos-nomina-staff` | GET | Admin | `pos_nomina_staff` | Staff list from POS/nómina system |
| `/api/admin/product-costs` | GET | Admin | `pos_products`, `pos_product_prices`, `pos_product_recipes`, `pos_ingredients`, `pos_ingredient_costs`, `pos_product_groups`, `pos_ingredient_categories` | Full product cost catalog (recipe → ingredient → cost chain) |

#### Nómina (Payroll)

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/nomina` | GET | Admin | `nomina_periodos`, `pos_nomina_staff`, `nomina_horas`, `nomina_novedades`, `nomina_propinas`, `nomina_provisiones`, `nomina_he_recargos` | Full payroll summary per period/sede |
| `/api/admin/nomina/[id]/novedades` | GET | Admin | `nomina_novedades`, `pos_nomina_staff` | Novedades (sick leave, permits, etc.) |
| `/api/admin/nomina/[id]/propinas` | GET | Admin | `nomina_propinas` | Tips distribution |
| `/api/admin/nomina/[id]/provisiones` | GET | Admin | `nomina_provisiones`, `pos_nomina_staff` | Provisiones (employer obligations: prima, cesantías, etc.) |
| `/api/admin/nomina/[id]/he-recargos` | GET | Admin | `nomina_he_recargos`, `pos_nomina_staff` | Overtime & surcharges |
| `/api/admin/nomina/ops-costs` | GET | Admin | `nomina_periodos`, `pos_nomina_staff`, `nomina_horas`, `nomina_novedades`, `nomina_provisiones`, `nomina_he_recargos`, `nomina_propinas` | Operational cost breakdown (payroll + extras vs revenue) |
| `/api/admin/nomina-ddl` | POST | Admin | DDL | **One-time**: Creates all nómina tables (DELETE AFTER USE) |
| `/api/admin/nomina-import` | POST | Import Token / Admin | All nómina tables | Data import via token or admin auth |
| `/api/admin/nomina-staff` | GET | Admin | `pos_nomina_staff` | Staff for shift scheduling (with area filter) |

#### Customers & CRM

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/customers` | POST | Admin | `customers` | Find or create customer by phone |
| `/api/admin/customers/[id]` | GET | Admin | `customers`, `customer_stats`, `visit_history`, `reservations` | Full customer profile |
| `/api/admin/customers/[id]/tags` | POST, DELETE | Admin | `customer_tags`, `customer_tag_links` | Add/remove customer tags |
| `/api/admin/customers/ids` | GET | Admin | `customers`, `customer_stats`, `customer_tag_links` | Filtered customer ID list (for segmentation) |
| `/api/admin/customers/segment-counts` | GET | Admin | `customers`, `customer_stats` | Counts per segment (new, recurring, dormant, vip) |
| `/api/admin/customers/analytics` | GET | Admin | `customers`, `customer_stats`, `reservations` (or RPC `get_analytics_overview`) | Full analytics: totals, reactivation, loyalty tiers |
| `/api/admin/customers/analytics/no-show-today` | GET | Admin | `reservations`, `customer_stats` | No-show risk alerts for today |
| `/api/admin/customers/analytics/trends` | GET | Admin | `customers`, `reservations` | Weekly trend data |
| `/api/admin/customers/analytics/table-demand` | GET | Admin | `reservations`, `tables` | Party-size demand vs table supply |
| `/api/admin/customers/analytics/vip-inactive` | GET | Admin | `customer_stats` | VIP customers who haven't visited in N days |
| `/api/admin/segments` | GET, POST | Admin | `customer_segments` | List/create customer segments |
| `/api/admin/tags` | GET, POST | Admin | `customer_tags` | List/create customer tags |
| `/api/admin/tags/[id]` | PATCH, DELETE | Admin | `customer_tags` | Update/delete tag |
| `/api/admin/campaigns` | POST | Admin | `customer_stats` | Estimate campaign audience size |
| `/api/admin/templates` | GET, POST | Admin | `email_templates` | List/create email templates |

#### Shifts (Shift Scheduling)

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/shift-schedules` | GET | Admin | `shift_schedules`, `pos_nomina_staff` | Get schedule for area+week |
| `/api/admin/shift-schedules` | POST | Admin | `shift_schedules` | Create new schedule (draft) |
| `/api/admin/shift-schedules/[id]/publish` | POST | Admin (super_admin/store_admin/lider_area) | `shift_schedules`, `shift_assignments`, `pos_nomina_staff` | Publish draft schedule + send emails |
| `/api/admin/shift-assignments` | PUT | Admin | `shift_assignments`, `shift_schedules`, `shift_types`, `pos_nomina_staff` | Batch save assignments with cost calculation |
| `/api/admin/shift-checkin` | POST | Admin or Employee | `shift_assignments`, `user_roles` | Check in to shift (sets checkin_at, sends email) |
| `/api/admin/shift-checkout` | POST | Admin or Employee | `shift_assignments`, `user_roles` | Check out of shift (sets checkout_at, sends email) |
| `/api/admin/shift-my-week` | GET | Admin or Employee | `shift_schedules`, `shift_assignments`, `shift_types`, `pos_nomina_staff`, `user_roles` | Employee's own weekly schedule |
| `/api/admin/shift-my-hours` | GET | Admin or Employee | `shift_assignments`, `shift_types`, `user_roles` | Employee's worked hours for a week |
| `/api/admin/shift-novedades` | POST | Admin or Employee | `shift_schedules`, `shift_novedades`, `user_roles` | Report absence/late/permission/incapacidad (24hr advance rule for employees) |
| `/api/admin/shift-type` | PATCH | Admin | `shift_types` | Update shift type definition |

#### Rodrigo / Seadotec (Separate Database)

| Endpoint | Method | Auth | Tables Queried | Returns |
|----------|--------|------|-----------------|---------|
| `/api/admin/rodri` | GET | Admin | `employees`, `teams`, `turnos_config`, `schedules`, `params`, `product_mix`, `ventas` | All data from Rodrigo's separate Supabase instance |

#### Debug

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|------|---------|
| `/api/admin/debug` | GET | Admin | Health-check: env vars, auth, DB connection, tables |

---

## 5. Hooks

All hooks live in `lib/hooks/`.

### Admin Dashboard Hooks

| Hook | File | Fetches From | Returns | Key Dependencies |
|------|------|-------------|---------|------------------|
| `useAdminDashboard(date)` | `useAdminDashboard.ts` | `/api/admin/dashboard?date=` | `{ reservations[], activeTables, allTables, zones }` + loading/error/refetch | date |
| `useAdminReservations(date)` | `useAdminReservations.ts` | `/api/admin/reservations` | `{ reservations[], loading, refetch }` | date |
| `useAdminOccupancy(date)` | `useAdminOccupancy.ts` | `/api/admin/occupancy?date=` | `{ tables[], zones[], combinations[], tableReservationsMap, unassigned }` | date |
| `useAdminMetrics()` | `useAdminMetrics.ts` | `/api/admin/metrics` | `{ conversionRate, noShowRate, avgPartySize, peakHours, bySource, dailyTrend, totalCapacity }` | - |
| `useDatesWithReservations(centerDate)` | `useDatesWithReservations.ts` | `/api/admin/dates-with-reservations?center=&range=` | `{ dates: Set<string>, days: Map<string, number> }` | centerDate |

### Host Hooks

| Hook | File | Fetches From | Returns |
|------|------|-------------|---------|
| `useHostDashboard(date)` | `useHostDashboard.ts` | `/api/admin/dashboard?date=` | Same shape as useAdminDashboard |
| `useHostOccupancy(date)` | `useHostOccupancy.ts` | `/api/admin/occupancy?date=` | Occupancy data with timeline per table |

### POS Dashboard Hooks

| Hook | File | Fetches From | Returns |
|------|------|-------------|---------|
| `usePOSDashboard(filters)` | `usePOSDashboard.ts` | `/api/admin/pos-dashboard?zone=&category=&from=&to=` | KPIs, zone revenue, hourly data, top products, categories, staff performance, drill-down support |
| `usePOSCalendar(zone)` | `usePOSCalendar.ts` | `/api/admin/pos-calendar?zone=` | `{ dailyTrend[], availableMonths[] }` |
| `usePOSCosts(filters)` | `usePOSCosts.ts` | `/api/admin/pos-costs?from=&to=` | Cost analytics: ingredient costs, category breakdown, COGS |
| `useProductCostCatalog()` | `useProductCostCatalog.ts` | `/api/admin/product-costs` | Full product→recipe→ingredient→cost catalog |

### Nómina Hooks

| Hook | File | Fetches From | Returns |
|------|------|-------------|---------|
| `useNomina(sede, periodo)` | `useNomina.ts` | `/api/admin/nomina?sede=&periodo=` | Full payroll data: periodos, resumen, staff details, horas, novedades, propinas, provisiones, HE/recargos |
| `useNominaOpsCosts(sede, periodo)` | `useNominaOpsCosts.ts` | `/api/admin/nomina/ops-costs?sede=&periodo=` | Operational costs: payroll cost breakdown vs revenue |

### Customer / CRM Hooks

| Hook | File | Fetches From | Returns |
|------|------|-------------|---------|
| `useCustomers()` | `useCustomers.ts` | `/api/admin/customers/ids`, `/api/admin/customers/segment-counts` | Paginated customer list, segment counts, quick filters |
| `useCustomerDetail()` | `useCustomerDetail.ts` | `/api/admin/customers/[id]` | Customer profile, stats, visits, reservations |
| `useCustomerTags()` | `useCustomerTags.ts` | `/api/admin/tags` | Tag list + createTag function |
| `useCustomerAnalytics()` | `useCustomerAnalytics.ts` | `/api/admin/customers/analytics` | Full CRM analytics |
| `useNoShowToday(date)` | `useNoShowToday.ts` | `/api/admin/customers/analytics/no-show-today?date=` | Today's no-show risk alerts |
| `useVIPInactive(days)` | `useVIPInactive.ts` | `/api/admin/customers/analytics/vip-inactive?days=` | Inactive VIP customers |
| `useWeeklyTrends(weeks)` | `useWeeklyTrends.ts` | `/api/admin/customers/analytics/trends?weeks=` | Weekly trend data |
| `useTableDemand()` | `useTableDemand.ts` | `/api/admin/customers/analytics/table-demand` | Demand vs supply analysis |

### Shift Hooks

| Hook | File | Fetches From | Returns |
|------|------|-------------|---------|
| `useShiftData(area, weekOffset)` | `useShiftData.ts` | `/api/admin/shift-schedules`, `/api/admin/shift-type` | Schedule, assignments, shift types, staff, cost estimation |
| `useTableInventory()` | `useTableInventory.ts` | `/api/admin/inventory/tables`, `/api/admin/inventory/zones` | Tables, zones, combinations |
| `useTableSuggestion()` | `useTableSuggestion.ts` | `/api/admin/table-suggestion` | AI table suggestion + override logging |
| `useFloorPlan(date)` | `useFloorPlan.ts` | `/api/admin/floorplan?date=` | 2D floor plan with reservations |

### Other Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useRodriData()` | `useRodriData.ts` | Fetches from `/api/admin/rodri` — Rodrigo's Seadotec DB |
| `usePrefersReducedMotion()` | `usePrefersReducedMotion.ts` | Respects `prefers-reduced-motion` media query |

---

## 6. Admin Components (by Domain)

All admin components live under `components/admin/`.

### 6.1 AdminShell — The Container

**File:** `components/admin/AdminShell.tsx`

The main admin shell renders a header (`AdminHeader`) and tab bar (`AdminTabBar`) with 12 sub-panels:

| Tab Key | Label | Panel Component | Data Hook |
|---------|-------|----------------|-----------|
| `reservas` | Reservas | `ReservationsPanel` | `useAdminDashboard`, `useAdminReservations` |
| `ocupacion` | Ocupación | `OccupancyPanel` | `useAdminDashboard`, `useAdminOccupancy` |
| `mesas` | Mesas | `TablesPanel` (inventory) | `useTableInventory` |
| `metrics` | Metrics | `MetricsPanel` | `useAdminMetrics` |
| `pos-dashboard` | POS Dashboard | `POSDashboardPanel` | `usePOSDashboard`, `usePOSCosts`, `useProductCostCatalog` |
| `customers` | Clientes | `CustomersPanel` | `useCustomers`, `useCustomerDetail`, `useCustomerTags` |
| `menu` | Menú | `MenuPanel` | Direct fetch to `/api/admin/menu` |
| `team` | Equipo | `TeamPanel` | Direct fetch to `/api/admin/staff` |
| `floorplan` | Plano | `FloorPlanMap` | `useFloorPlan` |
| `nomina` | Nómina | `NominaUnifiedPanel` | `useNomina`, `useNominaOpsCosts` |
| `rodri` | Rodrigo | `RodriPanel` | `useRodriData` |
| `shifts` | Turnos | `ShiftSchedulePanel` | Direct fetch + `useShiftData` |

### 6.2 Reservations Domain (`components/admin/reservations/`)

| Component | File | Purpose | Key Props / State |
|-----------|------|---------|-------------------|
| `ReservationsPanel` | `ReservationsPanel.tsx` | Main reservations view | `selectedDate`, `onDateChange`; state: filter, detailId, showNewForm, confirmAction |
| `ReservationCalendar` | `ReservationCalendar.tsx` | Date picker with dots for reservation days | date, onDateChange, datesWithReservations |
| `DayStatsRow` | `DayStatsRow.tsx` | Aggregate stats for selected day | reservations count, pax, etc. |
| `StatusFilter` | `StatusFilter.tsx` | Filter chips: all/pending/confirmed/seated/completed/cancelled/no_show | filter, onFilterChange |
| `ReservationTimeline` | `ReservationTimeline.tsx` | Chronological list of reservations | reservations[], onStatusChange, onViewDetail |
| `ReservationDetail` | `ReservationDetail.tsx` | Slide-out detail panel for one reservation | reservation, onClose, onStatusChange |
| `ReservationForm` | `ReservationForm.tsx` | Create new reservation form | onClose, onCreated |

### 6.3 Occupancy Domain (`components/admin/occupancy/`)

| Component | File | Purpose |
|-----------|------|---------|
| `OccupancyPanel` | `OccupancyPanel.tsx` | Main occupancy view: gauge + zone breakdown + table map |
| `OccupancyGauge` | `OccupancyGauge.tsx` | Circular gauge showing current occupancy % |
| `ZoneBreakdown` | `ZoneBreakdown.tsx` | Per-zone occupancy bars |
| `TableMap` | `TableMap.tsx` | Visual grid of tables with status colors |

### 6.4 Metrics Domain (`components/admin/metrics/`)

| Component | File | Purpose |
|-----------|------|---------|
| `MetricsPanel` | `MetricsPanel.tsx` | Main metrics dashboard |
| `PeakHoursChart` | `PeakHoursChart.tsx` | Bar chart of reservations by hour |
| `SourceBreakdown` | `SourceBreakdown.tsx` | Pie/bar of web vs pre_paid etc. |
| `ConversionCard` | `ConversionCard.tsx` | Pending→confirmed conversion rate |
| `NoShowCard` | `NoShowCard.tsx` | No-show rate |
| `PartySizeCard` | `PartySizeCard.tsx` | Average party size |
| `DailyTrendChart` | `DailyTrendChart.tsx` | 14-day reservation trend line |

### 6.5 POS Dashboard Domain (`components/admin/pos-dashboard/`)

| Component | File | Purpose |
|-----------|------|---------|
| `POSDashboardPanel` | `POSDashboardPanel.tsx` | Main POS dashboard with 3 tabs: operation, costs, catalog |
| `POSFiltersBar` | `POSFiltersBar.tsx` | Zone + category + date range filters |
| `RevenueHeatmapCalendar` | `RevenueHeatmapCalendar.tsx` | Calendar heatmap (revenue/tips/checks/personas by day) |
| `DayKPIBar` | `DayKPIBar.tsx` | Day-level KPI summary |
| `ZoneRevenueChart` | `ZoneRevenueChart.tsx` | Revenue by zone |
| `HourlyRevenueChart` | `HourlyRevenueChart.tsx` | Revenue by hour |
| `TopProductsTable` | `TopProductsTable.tsx` | Top-selling products table |
| `CategoryBreakdown` | `CategoryBreakdown.tsx` | Revenue by product category |
| `StaffPerformanceTable` | `StaffPerformanceTable.tsx` | Staff server performance |
| `PaymentMethodsChart` | `PaymentMethodsChart.tsx` | Payment method distribution |
| `ClientTiersCard` | `ClientTiersCard.tsx` | Client VIP/recurring/new tiers |
| `ClientSplitCard` | `ClientSplitCard.tsx` | Client type split |
| `TopProductByCategoryChart` | `TopProductByCategoryChart.tsx` | Top product per category |
| `DayPerformanceCard` | `DayPerformanceCard.tsx` | Day performance summary |
| `CategoryCompanionsCard` | `CategoryCompanionsCard.tsx` | Items frequently ordered together |
| `ShiftReconciliation` | `ShiftReconciliation.tsx` | Shift-opening vs closing reconciliation |
| `CategoryPerformersCard` | `CategoryPerformersCard.tsx` | Best/worst performing categories |
| `ProductCostTable` | `ProductCostTable.tsx` | Product cost catalog table |
| `ProductRecipeDetail` | `ProductRecipeDetail.tsx` | Recipe/ingredient detail for a product |
| `POSCostPanel` | `POSCostPanel.tsx` | Cost analysis panel (COGS, etc.) |
| `DataUploadSection` | `DataUploadSection.tsx` | JSON file upload for POS data import |
| `DrillDownPanel` | `DrillDownPanel.tsx` | Drill-down on specific KPI metric |
| `KPICard` | `KPICard.tsx` | Reusable KPI display card |

### 6.6 Customers / CRM Domain (`components/admin/customers/`)

| Component | File | Purpose |
|-----------|------|---------|
| `CustomersPanel` | `CustomersPanel.tsx` | Main CRM view with analytics + list toggle |
| `CustomerFilters` | `CustomerFilters.tsx` | Search, tag, email, visits filters |
| `CustomerList` | `CustomerList.tsx` | Paginated customer table |
| `CustomerDetail` | `CustomerDetail.tsx` | Full customer profile drawer |
| `CampaignComposer` | `CampaignComposer.tsx` | Compose campaign to segment |
| `CustomerAnalyticsPanel` | `CustomerAnalyticsPanel.tsx` | Analytics charts and stats |
| `SegmentTabs` | `SegmentTabs.tsx` | Segment selection tabs (new, recurring, dormant, VIP) |
| `QuickFilterChips` | `QuickFilterChips.tsx` | Quick filter buttons |

### 6.7 Menu Management Domain (`components/admin/menu/`)

| Component | File | Purpose |
|-----------|------|---------|
| `MenuPanel` | `MenuPanel.tsx` | Menu CRUD: categories + items with inline editing |
| `MenuItemForm` | `MenuItemForm.tsx` | Create/edit menu item form |
| `CategoryForm` | `CategoryForm.tsx` | Create/edit category form |

### 6.8 Team Domain (`components/admin/team/`)

| Component | File | Purpose |
|-----------|------|---------|
| `TeamPanel` | `TeamPanel.tsx` | Staff management: list + add form |
| `StaffList` | `StaffList.tsx` | Staff member list with role badges |
| `AddStaffForm` | `AddStaffForm.tsx` | Add staff member form (email + role + employee link) |

### 6.9 Inventory Domain (`components/admin/inventory/`)

| Component | File | Purpose |
|-----------|------|---------|
| `TablesPanel` | (inventory/) | Table CRUD with zone dropdowns |
| ZonesPanel | (inventory/) | Zone management |
| CombinationsPanel | (inventory/) | Table combination management |

### 6.10 Floor Plan Domain (`components/admin/floorplan/`)

| Component | File | Purpose |
|-----------|------|---------|
| `FloorPlanMap` | `FloorPlanMap.tsx` | 2D interactive floor plan with drag/position |

### 6.11 Nómina Domain (`components/admin/nomina/`)

| Component | File | Purpose |
|-----------|------|---------|
| `NominaUnifiedPanel` | `NominaUnifiedPanel.tsx` | Main payroll dashboard: periodos, resumen, staff detail, daily breakdown |
| `NominaContablePanel` | `NominaContablePanel.tsx` | Contable (accounting) sub-view with provisiones, HE/recargos, etc. |

**Key State in NominaUnifiedPanel:** sede (C75/C85), periodo selection, active staff detail, daily/hourly breakdown tabs

### 6.12 Rodrigo Domain (`components/admin/rodri/`)

| Component | File | Purpose |
|-----------|------|---------|
| `RodriPanel` | `RodriPanel.tsx` | Container with 6 sub-tabs |
| `ProductMixTab` | `ProductMixTab.tsx` | Product mix analysis from Seadotec |
| `TurnosNominaTab` | `TurnosNominaTab.tsx` | Turnos & nómina from Seadotec |
| `EquiposDiariosTab` | `EquiposDiariosTab.tsx` | Daily teams from Seadotec |
| `ParametrosTab` | `ParametrosTab.tsx` | Parameters from Seadotec |
| `SimulatorTab` | `SimulatorTab.tsx` | Schedule simulator |
| `AutoScheduleTab` | `AutoScheduleTab.tsx` | Auto-scheduling tool |

### 6.13 Shifts Domain (`components/admin/shifts/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ShiftSchedulePanel` | `ShiftSchedulePanel.tsx` | Main shift scheduling: area picker, week nav, grid, cost estimation |
| `ShiftGrid` | `ShiftGrid.tsx` | Employee×day grid with shift type dropdowns |
| `CostEstimationBar` | `CostEstimationBar.tsx` | Weekly cost estimation bar |
| `StaffPanel` | `StaffPanel.tsx` | Staff CRUD within shifts context (salary, area, contract type) |
| `ShiftTimelineView` | `ShiftTimelineView.tsx` | Visual timeline of shifts |

**Key State in ShiftSchedulePanel:**
- `area`: `'cocina' | 'barra' | 'servicio'`
- `tab`: `'cronograma' | 'costos' | 'horarios' | 'personal'`
- `weekOffset`: number (0 = current week)
- `grid`: `Record<employeeId, Record<dayIndex, shiftTypeCode>>`
- `scheduleId`, `scheduleStatus` (draft/published)
- `shiftTypes[]`, `staff[]`, `assignments[]`

### 6.14 Shared Admin Components (`components/admin/shared/`)

| Component | File | Purpose |
|-----------|------|---------|
| `AnimatedCard` | `AnimatedCard.tsx` | Framer Motion card with stagger delay |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Confirmation dialog for destructive actions |
| `SectionHeading` | `SectionHeading.tsx` | Styled section header |

---

## 7. Host Components

All under `components/host/`.

| Component | File | Purpose | Key Data |
|-----------|------|---------|----------|
| `HostShell` | `HostShell.tsx` | Main host stand container | Sub-tabs: Map/Reservas/Ocupación/QuickActions |
| `HostHeader` | `HostHeader.tsx` | Host stand header | Date picker, user info |
| `HostTableMap` | `HostTableMap.tsx` | Visual table status map | Tables with reservation overlay |
| `HostReservationQueue` | `HostReservationQueue.tsx` | Upcoming reservations list | Queue with urgency scores |
| `HostOccupancySummary` | `HostOccupancySummary.tsx` | Live occupancy gauge | % occupied, tables available |
| `HostQuickActions` | `HostQuickActions.tsx` | Quick action buttons | Seat, no-show, walk-in |
| `HostWalkInForm` | `HostWalkInForm.tsx` | Walk-in reservation form | Quick create + table assign |
| `HostFloorPlan` | `HostFloorPlan.tsx` | Floor plan view for host | 2D floor plan |
| `ReassignModal` | `ReassignModal.tsx` | Table reassignment modal | Change table for a reservation |

**Key Hooks Used by Host:** `useHostDashboard`, `useHostOccupancy`, `usePrefersReducedMotion`

---

## 8. Public Components

| Component | File | Purpose |
|-----------|------|---------|
| `Navbar` | `Navbar.tsx` | Navigation bar with logo, links, login/logout |
| `Footer` | `Footer.tsx` | Footer with restaurant info |
| `HeroSection` | `HeroSection.tsx` | Landing page hero with CTA |
| `MenuSection` | `MenuSection.tsx` | Public menu display (categories + items) |
| `PhotoCTA` | `PhotoCTA.tsx` | Photo grid with call-to-action |

---

## 9. Algorithm Modules

### `lib/algorithms/table-assignment.ts` — Core Engine

**Pure function table assignment algorithm.** No DB calls.

- **Scoring weights:** Capacity fit 40%, Zone priority 30%, Waste penalty 20%, Combine bonus 10%
- **Zone popularity ranking:** Tipi (B) > Taller (A) > Jardín (C) > Chispas (D) > Ático (E)
- **Key rules:**
  1. PROTECT combinable tables — couples (≤2) never get them unless no other option
  2. PRIORITIZE large groups first
  3. COMBINE tables for groups ≥4 when no single table fits
  4. RELEGATE small groups (2-3pax) to low-priority zones (E, D)
  5. ROUTE BY TIME: early (18-19h) → low zones; peak (20-22h) → high zones
  6. NO TABLE ROTATION — each table used once per night

**Exported types:** `TableWithZone`, `ZoneScore`, `AssignmentInput`, `AssignmentResult`

**Exported functions:**
- `assignTable(input)` → `AssignmentResult` — Main assignment function
- `checkAvailability(tables, date, partySize, ...)` — Availability checker
- `combineTables(tables, partySize)` — Find combinable table pairs

### `lib/algorithms/table-assignment-sim.ts` — Simulation

**Simplified simulation version** for the "Simulador" in Rodrigo panel.
- Uses same zone ranking and scoring principles
- `RestaurantTable`, `Reservation`, `Assignment` types
- `runSimulation(tables, reservations)` → `Assignment[]`

---

## 10. Utility Libraries

All under `lib/utils/`.

| File | Purpose | Key Exports |
|------|---------|-------------|
| `admin-auth.ts` | Server-side auth verification + service client | `getAdminUser()`, `getStaffUser()`, `getEmployeeUser()`, `getServiceClient()`, `RESTAURANT_ID` |
| `constants.ts` | App-wide constants | `RESTAURANT_ID`, other constants |
| `cn.ts` | Tailwind class merger | `cn(...classes)` — wraps `clsx` + `tailwind-merge` |
| `formatCOP.ts` | Colombian Peso formatter | `formatCOP(amount)` → `"$1.2M"` etc. |
| `formatCurrency.ts` | Generic currency formatter | `formatCurrency(amount, locale)` |
| `formatDate.ts` | Date formatting | Spanish locale date formatting |
| `format-time.ts` | Time formatting | `formatTime(timeStr)` → `"7:00 PM"` |
| `date.ts` | Colombian timezone helpers | `getColombiaTime()`, `getColombiaDateStr()` |
| `time.ts` | Time utilities | Hour/minute parsing and comparison |
| `serviceHours.ts` | Restaurant hours definition | Service hours per day, open/close times |
| `debounceRefetch.ts` | Debounced refetch helper | `useDebouncedRefetch(fn, delay)` |
| `sanitize.ts` | Input sanitization | `sanitizeLike(str)` — prevents SQL injection in LIKE patterns |
| `urgency.ts` | Reservation urgency scoring | `computeUrgency(reservation, currentTime)` → urgency level |
| `whatsapp.ts` | WhatsApp link builder | `buildWhatsAppLink(phone, message)` → URL |
| `zone-letter.ts` | Zone name → letter mapping | `getZoneLetter(zoneName)` → "A"-"E" |
| `costCalculator.ts` | Colombian labor cost calculator | `calcularCostoTurno()`, `calcularValorHora()`, `getWeekStr()`, `getWeekDates()`, `dayIndexToDateIndex()` |
| `ThemeProvider.tsx` | Dark/light mode provider | `ThemeProvider`, `useTheme()` |

### `costCalculator.ts` — Detail

Critical for shift scheduling and nómina. Implements Colombian labor law:

- `calcularCostoTurno(salary, shiftType, dayOfWeek)` → full cost breakdown
- `calcularValorHora(salary)` → hourly rate
- `getWeekStr(date)` → ISO week string `"2026-W23"`
- `getWeekDates(weekStr)` → array of 7 dates
- `dayIndexToDateIndex(dayIndex)` → maps JS `getDay()` (0=Dom) to ISO (1=Lun)

**Legal params (from `lib/types/shifts.ts`):**
- `MAX_WEEKLY_HOURS`: 44
- `MAX_DAILY_HOURS`: 8
- `NIGHT_SURCHARGE`: 0.35 (8pm-6am)
- `SUNDAY_SURCHARGE`: 0.75
- `TRANSPORT_ALLOWANCE`: $249,095 COP
- `MIN_SALARY`: $1,423,500 COP (2026)

---

## 11. Type Definitions

### `lib/types/shifts.ts`

```typescript
interface StaffMember {
  id: string
  nombre_completo: string
  cargo: string
  area: string
  secondary_areas: string[]
  salario: number
  sede: string
  contrato: string       // 'fijo' | 'turnante'
  activo: boolean
  aplica_propinas: boolean
  es_medio_tiempo: boolean
}

interface ShiftType {
  id: string
  code: string           // "A1", "B2", etc.
  name: string           // "Apertura Cocina"
  entrada: string        // "07:00"
  salida: string         // "15:00"
  ordinarias: number     // 8
  nocturnas: number      // 0
  is_split: boolean      // split shift?
  area: string           // "cocina" | "barra" | "servicio"
  description?: string
}

interface ShiftSchedule {
  id: string
  area: string
  week_str: string       // "2026-W23"
  version: number
  status: 'draft' | 'published'
  created_by: string
  created_at: string
}

interface ShiftAssignment {
  id: string
  schedule_id: string
  employee_id: string
  day_index: number      // 0=Dom, 1=Lun, ..., 6=Sab
  shift_type_code: string
  checkin_at?: string
  checkout_at?: string
  calculated_cost?: number
}

// Colombian labor law constants
const LEGAL_PARAMS = {
  MAX_WEEKLY_HOURS: 44,
  MAX_DAILY_HOURS: 8,
  NIGHT_START: 20,       // 8pm
  NIGHT_END: 6,          // 6am
  NIGHT_SURCHARGE: 0.35,
  SUNDAY_SURCHARGE: 0.75,
  TRANSPORT_ALLOWANCE: 249095,
  MIN_SALARY: 1423500,
}
```

**Also exports:** `StaffMemberForShift` (extended with alias lookup), `ShiftNovedad`

### `lib/types/inventory.ts`

```typescript
interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
  floor_num: number | null
}

interface Table {
  id: string
  number: string
  name_attick: string | null
  capacity: number
  capacity_min: number
  zone_id: string
  is_active: boolean
  can_combine: boolean
  combine_group: string | null
  position_x: number | null
  position_y: number | null
  sort_order: number
}

interface Combination {
  id: string
  table_ids: string[]
  combined_capacity: number
  is_active: boolean
}
```

### `lib/types/analytics.ts`

```typescript
interface NoShowRisk {
  customer_id: string
  time_start: string
  party_size: number
  risk_level: 'high' | 'medium' | 'low'
  risk_factors: string[]
}

interface VIPCustomer {
  customer_id: string
  full_name: string
  total_visits: number
  last_visit_date: string
  loyalty_tier: string
}

interface WeeklyTrend {
  week: string
  label: string
  activeCount: number
  newCount: number
  noShowCount: number
  reservationCount: number
  retentionPct: number
}

interface TableDemandBucket {
  size2: number
  size4: number
  size6: number
  size8plus: number
}

interface Campaign {
  segment: 'dormant' | 'occasional' | 'vip_inactive' | 'all'
  channel: 'whatsapp' | 'email'
  audience: number
  template?: string
}
```

---

## 12. Supabase Configuration

### `lib/supabase/client.ts` — Browser Client
- Uses `@supabase/supabase-js` `createClient`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Exported as `supabase` — used by client components

### `lib/supabase/server.ts` — Server Client (SSR)
- Uses `@supabase/ssr` `createServerClient`
- Cookie-based session management for server components & API routes
- Export: `createServerSupabaseClient()`

### `lib/supabase/rodri-client.ts` — Rodrigo's Database
- Separate Supabase instance for Seadotec data
- Uses `NEXT_PUBLIC_RODRI_SUPABASE_URL`, `RODRI_SUPABASE_SERVICE_ROLE_KEY`
- Tables: `employees`, `teams`, `turnos_config`, `schedules`, `params`, `product_mix`, `ventas`

---

## 13. Email System

### `lib/email/send.ts`

Uses **Resend** API (`RESEND_API_KEY`).  
From address: `Attick & Keller <ventas@ccs724.com>`

**Email types:**
| Function | Trigger | Template |
|----------|--------|----------|
| `sendReservationEmail()` | Reservation status change | Status-specific HTML (pending/confirmed/cancelled/no_show) |
| `sendShiftScheduleEmail()` | Schedule published | Weekly schedule summary |
| `sendShiftCheckinEmail()` | Employee checks in | Check-in confirmation |
| `sendShiftCheckoutEmail()` | Employee checks out | Check-out confirmation + hours summary |
| `sendShiftNovedadEmail()` | Employee reports novedad | Absence/late/permission notification to admin |

---

## 14. Database Tables Referenced

### Core Restaurant

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `reservations` | Reservations | id, date, time_start, time_end, party_size, status, customer_id, table_id, zone_id, source, special_requests, restaurant_id |
| `tables` | Restaurant tables | id, number, name_attick, capacity, capacity_min, zone_id, is_active, can_combine, combine_group, position_x, position_y, sort_order, restaurant_id |
| `table_zones` | Dining zones | id, name, description, sort_order, floor_num, restaurant_id |
| `table_combinations` | Combinable table groups | id, table_ids, combined_capacity, is_active, restaurant_id |
| `customers` | Customer profiles | id, full_name, phone, email, preferences, notes, restaurant_id |
| `customer_stats` | Aggregated customer data | customer_id, total_visits, total_spent, last_visit_date, no_show_count, is_recurring, loyalty_tier |
| `visit_history` | Visit records | id, customer_id, visit_date, party_size, total_spent, feedback_rating, no_show |
| `menu_categories` | Menu sections | id, name, description, icon, sort_order, is_active, restaurant_id |
| `menu_items` | Menu dishes | id, name, description, price, category_id, image_url, is_featured, is_available, sort_order, pos_product_id, pos_group_id, restaurant_id |
| `menu_item_ingredients` | Dish ingredients | id, menu_item_id, ingredient_name, quantity, unit |
| `user_roles` | Role assignments | id, auth_user_id, role, is_active, restaurant_id, pos_nomina_staff_id, area |

### CRM

| Table | Purpose |
|-------|---------|
| `customer_tags` | Tag definitions (name, color, sort_order) |
| `customer_tag_links` | Many-to-many customer↔tag |
| `customer_segments` | Saved segment definitions |
| `email_templates` | Email template store |

### POS (Point of Sale)

| Table | Purpose |
|-------|---------|
| `pos_sales` | Sale transactions (pos_folio, pos_series, opened_at, total, tip_amount, party_size, etc.) |
| `pos_sale_items` | Items per sale |
| `pos_products` | Product catalog from POS |
| `pos_product_groups` | Product categories from POS |
| `pos_product_prices` | Product pricing (price, tax1, tax2, tax3) |
| `pos_product_recipes` | Recipe linking (product → ingredients) |
| `pos_staff` | Staff from POS system |
| `pos_areas` | Zone/area definitions from POS |
| `pos_sale_payments` | Payment records |
| `pos_payment_methods` | Payment method catalog |
| `pos_purchases` | Purchase/invoice records |
| `pos_purchase_items` | Purchase line items |
| `pos_ingredients` | Ingredient inventory |
| `pos_ingredient_categories` | Ingredient category taxonomy |
| `pos_ingredient_costs` | Ingredient cost tracking |
| `pos_nomina_staff` | Staff for nómina (nombre_completo, cargo, area, salario, sede, contrato, activo, etc.) |

### Nómina (Payroll)

| Table | Purpose |
|-------|---------|
| `nomina_periodos` | Payroll periods (periodo, fecha_inicio, fecha_fin, sede, estado) |
| `nomina_horas` | Hours worked per employee per period |
| `nomina_novedades` | Absences/late/permissions/incapacidad |
| `nomina_propinas` | Tips distribution |
| `nomina_provisiones` | Employer obligations (prima, cesantías, intereses, vacaciones, aportes) |
| `nomina_he_recargos` | Overtime & surcharges (HE diurnas/nocturnas, recargos dominicales/festivos) |

### Shifts

| Table | Purpose |
|-------|---------|
| `shift_schedules` | Schedule per area+week (area, week_str, version, status: draft/published) |
| `shift_assignments` | Assignment: employee + day + shift_type + checkin/checkout timestamps |
| `shift_types` | Shift type definitions (code, name, entrada, salida, ordinarias, nocturnas, area) |
| `shift_novedades` | Schedule-level novedades (falta, tarde, permiso, incapacidad) |

### Rodrigo (Seadotec) — Separate Database

| Table | Purpose |
|-------|---------|
| `employees` | Rodrigo's employee list |
| `teams` | Team definitions |
| `turnos_config` | Shift type configurations |
| `schedules` | Published schedules |
| `params` | System parameters |
| `product_mix` | Product mix analytics |
| `ventas` | Sales data |

---

## 15. Environment Variables

| Variable | Used By | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server + API | Main Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + SSR | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes | Service-role key (bypasses RLS) |
| `NEXT_PUBLIC_RODRI_SUPABASE_URL` | Rodri API | Rodrigo's separate Supabase |
| `RODRI_SUPABASE_SERVICE_ROLE_KEY` | Rodri API | Rodrigo's service key |
| `RESEND_API_KEY` | Email sender | Resend email API |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | (if present) | Google Maps integration |

---

## Cross-Reference: Component → API → Table Chain

### Reservation Flow
```
ReservationsPanel
  → useAdminDashboard(date) → /api/admin/dashboard → reservations + tables + customers
  → useAdminReservations(date) → /api/admin/reservations → reservations + customers
  → ReservationForm → POST /api/admin/reservations → assignTable() → tables
```

### Occupancy Flow
```
OccupancyPanel
  → useAdminOccupancy(date) → /api/admin/occupancy → tables + reservations + combinations
  → computeUrgency(reservation, currentTime) → urgency score
```

### POS Dashboard Flow
```
POSDashboardPanel
  → usePOSDashboard(filters) → /api/admin/pos-dashboard → pos_sales + pos_sale_items + pos_products + ...
  → usePOSCosts(filters) → /api/admin/pos-costs → pos_purchases + pos_ingredients
  → DrillDownPanel → /api/admin/pos-dashboard/detail → deep drill on metric
```

### Nómina Flow
```
NominaUnifiedPanel
  → useNomina(sede, periodo) → /api/admin/nomina → nomina_periodos + nomina_horas + pos_nomina_staff + ...
  → useNominaOpsCosts(sede, periodo) → /api/admin/nomina/ops-costs → payroll vs revenue
```

### Shift Scheduling Flow
```
ShiftSchedulePanel
  → GET /api/admin/shift-schedules?area=&week_str= → shift_schedules + pos_nomina_staff
  → PUT /api/admin/shift-assignments → shift_assignments (batch save + cost calc)
  → POST /api/admin/shift-schedules/[id]/publish → published schedule + emails
  → Shift checkin/checkout → /api/admin/shift-checkin|checkout → shift_assignments
```

### Customer CRM Flow
```
CustomersPanel
  → useCustomers() → /api/admin/customers/ids + segment-counts
  → useCustomerDetail() → /api/admin/customers/[id]
  → useCustomerAnalytics() → /api/admin/customers/analytics
  → CampaignComposer → POST /api/admin/campaigns
```

---

*End of CODEMAP. This document represents a complete scan of all 277 source files as of May 2026.*