# POS Dashboard Audit Report

**Date:** 2026-05-26  
**Scope:** Operacion tab — all components, API route, hook, data flow  
**Files audited:** 23 components + 1 API route + 1 hook

---

## 1. Executive Summary

### Critical Finding: Products/Categories Data Missing for Non-April Months

**ROOT CAUSE:** The `pos_sale_items` table only has ~17K rows from an old April 2026 import. The `cheqdet` table (882K line items) has **NOT** been imported into `pos_sale_items`. This means:

- **April 2026** (39 sales): Products/categories data shows correctly (those 39 sales have `pos_sale_items`)
- **All other months** (Jan, Feb, Mar, May — 2000+ sales each): Products/categories sections show **NO DATA** because `pos_sale_items` rows don't exist for those months' sale IDs

The API route at `route.ts:304-318` queries `pos_sale_items` by sale IDs. When no `pos_sale_items` exist for a given range, all product-derived data (`topProducts`, `topCategories`, `topProductByCategory`, `productsByCategory`, `categoryCompanions`, `topPerformersByCategory`, `bottomPerformersByCategory`) returns empty arrays.

### Hardcoded Date Found

`NominaCostSection.tsx:62` hardcodes `'ABRIL 2026'` — this is outside the main POS dashboard flow but exists in the same directory.

---

## 2. Component Inventory & Props

| # | Component | File | Props Received |
|---|-----------|------|---------------|
| 1 | **POSDashboardPanel** | `POSDashboardPanel.tsx` | None (root container, uses `usePOSDashboard` hook internally) |
| 2 | **POSFiltersBar** | `POSFiltersBar.tsx` | `filters`, `onChange`, `categoryList`, `zoneList?`, `availableMonths?` |
| 3 | **RevenueHeatmapCalendar** | `RevenueHeatmapCalendar.tsx` | `dailyData`, `selectedDate?`, `onDayClick`, `metric`, `onMetricChange` |
| 4 | **DayKPIBar** | `DayKPIBar.tsx` | `kpis`, `averages?`, `isSingleDay?` |
| 5 | **KPICard** | `KPICard.tsx` | `label`, `value`, `icon?`, `subtext?`, `format?`, `className?` |
| 6 | **KPIRow** | `KPIRow.tsx` | `kpis` (reused pattern, not currently in POSDashboardPanel render) |
| 7 | **DayPerformanceCard** | `DayPerformanceCard.tsx` | `date`, `kpis`, `byZone`, `topProducts`, `hourlyRevenue`, `staffPerformance`, `periodAverages?`, `onProductDrillDown?`, `onStaffDrillDown?`, `onZoneDrillDown?` |
| 8 | **ZoneRevenueChart** | `ZoneRevenueChart.tsx` | `data`, `selectedZone`, `onZoneClick`, `onZoneDrillDown?`, `unknownZone?` |
| 9 | **HourlyRevenueChart** | `HourlyRevenueChart.tsx` | `data`, `onHourDrillDown?` |
| 10 | **TopProductsTable** | `TopProductsTable.tsx` | `data`, `initialLimit?`, `expandedLimit?`, `onProductDrillDown?`, `selectedCategory?`, `productsByCategory?`, `selectedCategoryName?` |
| 11 | **CategoryBreakdown** | `CategoryBreakdown.tsx` | `data`, `selectedCategory`, `onCategoryClick`, `onCategoryDrillDown?`, `onProductDrillDown?`, `productsByCategory?` |
| 12 | **TopProductByCategoryChart** | `TopProductByCategoryChart.tsx` | `data`, `onProductDrillDown?`, `selectedCategory?`, `onCategoryDrillDown?`, `topPerformersByCategory?`, `bottomPerformersByCategory?` |
| 13 | **CategoryPerformersCard** | `CategoryPerformersCard.tsx` | `topPerformersByCat`, `bottomPerformersByCat`, `categoryNames`, `categoryList`, `selectedCategory`, `onCategoryClick`, `onProductDrillDown?` |
| 14 | **CategoryCompanionsCard** | `CategoryCompanionsCard.tsx` | `data` (array of `{cat1Id, cat1Name, cat2Id, cat2Name, sharedCheques}`) |
| 15 | **StaffPerformanceTable** | `StaffPerformanceTable.tsx` | `data`, `onStaffDrillDown?` |
| 16 | **PaymentMethodsChart** | `PaymentMethodsChart.tsx` | `data` |
| 17 | **ShiftReconciliation** | `ShiftReconciliation.tsx` | `data` (array of shifts) |
| 18 | **ClientTiersCard** | `ClientTiersCard.tsx` | `data` (array of `{tier, count, totalSpent}`) |
| 19 | **ClientSplitCard** | `ClientSplitCard.tsx` | `data` (`{consumidorFinal, identificados}`) |
| 20 | **DataUploadSection** | `DataUploadSection.tsx` | `onUploadComplete` |
| 21 | **DrillDownPanel** | `DrillDownPanel.tsx` | `drillDown`, `data`, `loading`, `error`, `onClose` |
| 22 | **POSDailyTrendChart** | `POSDailyTrendChart.tsx` | `data`, `onDayClick?` (not currently rendered in POSDashboardPanel) |
| 23 | **NominaCostSection** | `NominaCostSection.tsx` | None (uses `useNominaOpsCosts('ABRIL 2026')` internally — **HARDCODED**) |

---

## 3. Data Flow Trace: API → Hook → Components

### 3.1 API Route (`/api/admin/pos-dashboard/route.ts`)

**Step-by-step data assembly:**

1. **Parse filters** (lines 83-128): zone, category, from/to. Auto-detects latest month if no dates specified.
2. **Fetch `pos_sales`** (lines 131-154): Paginated fetch with date range + `is_cancelled=false`. Fields: `id, total, tip_amount, subtotal, tax_amount, item_count, party_size, opened_at, closed_at, derived_zone_name, is_cancelled, pos_staff_id, pos_customer_id, customer_id, card_paid, cash_paid`.
3. **Category filter** (lines 157-180): If category selected, finds sale IDs via `pos_products` → `pos_sale_items`.
4. **Apply zone/category filters** (lines 182-189): Filters `allSales` → `filteredSales` / `salesForKPIs`.
5. **Compute KPIs** (lines 198-215): Revenue, tips, party size, avg service time, etc.
6. **Compute byZone** (lines 218-254): Groups by `derived_zone_name`, separates "Desconocido".
7. **Compute hourlyRevenue** (lines 257-279): Groups by hour of `opened_at`.
8. **Compute dailyTrend** (lines 282-302): Groups by date slice of `opened_at`.
9. **⚠️ Fetch `pos_sale_items`** (lines 304-318): Queries by ALL sale IDs. **THIS IS THE BREAKPOINT.** Returns empty if no `pos_sale_items` rows match.
10. **Fetch `pos_products` info** (lines 321-336): Maps product IDs to names + group IDs.
11. **Fetch `pos_product_groups` names** (lines 339-354): Maps group IDs to names.
12. **Build product/category data** (lines 361-464): `productRevenueMap`, `categoryRevenueMap`, `topCategories`, `topProductByCategory`.
13. **Build productsByCategory** (lines 466-491).
14. **Build top/bottom performers** (lines 493-512).
15. **Build category companions** (lines 514-539): Pairs of categories appearing in same cheques.
16. **Apply category filter to items** (lines 541-549): Re-filters for `topProducts` (filtered version).
17. **Compute filtered topProducts** (lines 551-568).
18. **Compute staffPerformance** (lines 570-609).
19. **Compute paymentMethods** (lines 611-655).
20. **Compute clientTiers** (lines 657-679).
21. **Compute clientSplit** (lines 681-696).
22. **Build categoryList** (lines 698-707).
23. **Fetch shifts** (lines 709-728).
24. **Compute byZonePayment** (lines 730-767).
25. **Assemble response** (lines 769-803).

### 3.2 Hook (`usePOSDashboard.ts`)

- Accepts `POSDashboardFilters { zone, category, from?, to? }`
- Builds URL params from filters
- Fetches `/api/admin/pos-dashboard?{params}`
- Returns `{ data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown }`
- Uses AbortController for StrictMode race conditions
- Also provides `fetchDrillDown` which calls `/api/admin/pos-dashboard/detail?type=...&id=...`
- `POSDashboardData` interface matches API response shape exactly

### 3.3 POSDashboardPanel → Component Props Wiring

```
POSDashboardPanel
├── POSFiltersBar (filters, onChange, categoryList, zoneList, availableMonths)
├── RevenueHeatmapCalendar (calendarTrend, selectedDate, onDayClick, metric, onMetricChange)
├── DrillDownPanel (drillDown, drillDownData, drillDownLoading, drillDownError, onClose)
├── DayPerformanceCard (date, data.kpis, data.byZone, data.topProducts, data.hourlyRevenue, data.staffPerformance, ...)
├── DayKPIBar (data.kpis, periodAverages, isSingleDay)
├── ZoneRevenueChart (data.byZone, selectedZone, onZoneClick, onZoneDrillDown, data.unknownZone)
├── HourlyRevenueChart (data.hourlyRevenue, onHourDrillDown)
├── TopProductsTable (data.topProducts, onProductDrillDown, selectedCategory, data.productsByCategory, selectedCategoryName)
├── CategoryBreakdown (data.topCategories, selectedCategory, onCategoryClick, onCategoryDrillDown, onProductDrillDown, data.productsByCategory)
├── TopProductByCategoryChart (data.topProductByCategory, onProductDrillDown, selectedCategory, onCategoryDrillDown, data.topPerformersByCategory, data.bottomPerformersByCategory)
├── CategoryCompanionsCard (data.categoryCompanions)
├── CategoryPerformersCard (data.topPerformersByCategory, data.bottomPerformersByCategory, categoryNames, data.categoryList, selectedCategory, onCategoryClick, onProductDrillDown)
├── StaffPerformanceTable (data.staffPerformance, onStaffDrillDown)
├── PaymentMethodsChart (data.paymentMethods)
├── ShiftReconciliation (data.shifts)
├── ClientTiersCard (data.clientTiers)
├── ClientSplitCard (data.clientSplit)
└── DataUploadSection (refetch)
```

---

## 4. Detailed Issues Found

### 4.1 CRITICAL: `pos_sale_items` Data Gap (Root Cause of Empty Products)

**Severity:** CRITICAL  
**Impact:** All 5 product-related components show "Sin datos" for any month except April

**Location:** API route lines 304-318

```typescript
const allSaleIds = allSales.map((s: any) => s.id)
let allItems: any[] = []
if (allSaleIds.length > 0) {
  for (let i = 0; i < allSaleIds.length; i += BATCH) {
    const batch = allSaleIds.slice(i, i + BATCH)
    const { data: itemsData } = await sb
      .from('pos_sale_items')
      .select('pos_sale_id, pos_product_id, quantity, unit_price')
      .in('pos_sale_id', batch)
    if (itemsData) allItems.push(...itemsData)
  }
}
```

When `allItems` is empty (no `pos_sale_items` matching those sale IDs):
- `productIdsInItems` = [] → no product info fetched
- `productRevenueMap` = empty → `topProducts` = []
- `categoryRevenueMap` = empty → `topCategories` = []
- `perCatProduct` = empty → `topProductByCategory` = []
- `productsByCategory` = {} → no expandable products in CategoryBreakdown
- `categoryCompanions` = [] → CategoryCompanionsCard shows "Sin datos"
- `topPerformersByCategory` / `bottomPerformersByCategory` = {} → CategoryPerformersCard returns null

**Fix Required:** Import `cheqdet` (882K line items) into `pos_sale_items` for Jan-May 2026 sales that are missing items.

### 4.2 HARDCODED DATE: `NominaCostSection.tsx` line 62

**Severity:** MEDIUM  
**Impact:** Nomina costs always show April 2026, never adapts to selected period

```typescript
const { data, loading, error } = useNominaOpsCosts('ABRIL 2026')
```

And line 87-88:
```typescript
<h3>Costos Nomina C75</h3>
<p className="...">Abril 2026 · Calle 75</p>
```

**Note:** This component is in the pos-dashboard directory but uses a separate hook/API. It's not rendered in `POSDashboardPanel` currently (not imported there).

### 4.3 HARDCODED DATES in Nomina API Routes (Not in POS Dashboard)

Found hardcoded `'2026-04-01'` / `'2026-04-30'` defaults in:
- `src/app/api/admin/nomina/route.ts` lines 135-136, 273-274
- `src/app/api/admin/nomina/ops-costs/route.ts` line 97

These are outside the POS dashboard scope but represent a similar pattern to fix.

### 4.4 Comment Reference to Hardcoded Date

**Severity:** NEGLIGIBLE  
**Location:** `RevenueHeatmapCalendar.tsx` line 121

```typescript
// Title format from our tooltip: "2026-04-15: Revenue: $22.5M · ..."
```

This is just a code comment, not functional. No impact.

---

## 5. Null / Missing Checks Audit

| Component | Issue | Severity | Status |
|-----------|-------|----------|--------|
| **POSDashboardPanel** | `data?.categoryList` fallback to `[]` on line 185 — OK | — | ✅ Safe |
| **POSDashboardPanel** | `data.topCategories?.find(...)` on line 277 — optional chain OK | — | ✅ Safe |
| **POSDashboardPanel** | `data.topProductByCategory \|\| []` on line 296 — defensive fallback | — | ✅ Safe |
| **POSDashboardPanel** | `data.categoryCompanions \|\| []` on line 308 — defensive fallback | — | ✅ Safe |
| **POSDashboardPanel** | `data.topPerformersByCategory \|\| {}` on line 314 — defensive fallback | — | ✅ Safe |
| **POSDashboardPanel** | `data.shifts \|\| []` on line 338 — defensive fallback | — | ✅ Safe |
| **TopProductsTable** | Empty `displayData` check — shows "Sin datos" | — | ✅ Safe |
| **CategoryBreakdown** | `Math.max(...data.map(...), 1)` — safe if data empty (returns 1) | — | ✅ Safe |
| **TopProductByCategoryChart** | Returns `null` when `!data \|\| data.length === 0` | — | ✅ Safe |
| **CategoryPerformersCard** | Returns `null` when `categoriesWithPerformers.length === 0` | — | ✅ Safe |
| **CategoryCompanionsCard** | `data.length === 0` check — shows "Sin datos" | — | ✅ Safe |
| **ZoneRevenueChart** | `Math.max(...data.map(...), 1)` — safe | — | ✅ Safe |
| **ZoneRevenueChart** | `unknownZone?.revenue > 0` conditional render | — | ✅ Safe |
| **HourlyRevenueChart** | Empty data check before rendering Recharts | — | ✅ Safe |
| **DayPerformanceCard** | `Math.max(...hourlyRevenue.map(...), 1)` — safe | — | ✅ Safe |
| **ShiftReconciliation** | `formatShortDateTime` handles `null` with `"-"` | — | ✅ Safe |
| **ClientSplitCard** | Division by zero protection: `total > 0` check | — | ✅ Safe |
| **DrillDownPanel** | Extensive null checks in each tab render | — | ✅ Safe |
| **KPICard** | Handles both `string` and `number` values | — | ✅ Safe |

**Verdict:** All components have adequate null/empty checks. No crashes expected from missing data.

---

## 6. Data Type Mismatch Audit

| Location | Potential Issue | Severity | Status |
|----------|----------------|----------|--------|
| API route line 137 | `opened_at, closed_at` used as strings for date math — works since Supabase returns ISO strings | LOW | ✅ OK |
| API route line 372 | `Number(item.quantity) \|\| 0` and `Number(item.unit_price) \|\| 0` — defensive for possible nulls | — | ✅ OK |
| API route line 198 | `Number(r.total) \|\| 0` — accounts for possible string totals from DB | — | ✅ OK |
| `DayKPIBar` | `averages[item.key as keyof KPIs]` — type cast is safe since keys match | — | ✅ OK |
| `TopProductsTable` line 105 | `p.label !== p.productName ? p.label : ''` — shows category label only when different from name. In current flow, `label` is always set to `productName`, so this column always shows empty string | LOW | ⚠️ Bug — category column never shows the category name |
| `StaffPerformanceTable` | `s.staffType === 1 ? 'Mesero' : s.staffType === 3 ? 'Caja' : ''` — only handles types 1 and 3 | LOW | ⚠️ Minor — other types show blank |
| `CategoryBreakdown` | No `avgServiceTime` displayed despite API providing it in `topCategories` | LOW | ℹ️ Data available but unused |

### Bug: TopProductsTable Category Column Always Empty

In `TopProductsTable.tsx` lines 40-54:

```typescript
const displayData = categoryProducts
  ? categoryProducts.map(p => ({
      productId: p.productId, productName: p.productName,
      label: p.productName,  // ← label = productName
      quantity: p.quantity, revenue: p.revenue,
    }))
  : data.map(p => ({
      productId: p.productId, productName: p.productName,
      label: p.productName,  // ← label = productName, NOT p.category
      quantity: p.quantity, revenue: p.revenue,
    }))
```

Then line 105: `{!categoryProducts && (<td>...{p.label !== p.productName ? p.label : ''}</td>)}`

Since `label` is always set to `productName`, `p.label !== p.productName` is always `false`, so the category column is always empty. It should be `label: p.category` for the non-filtered path.

---

## 7. Field Name Verification: API ↔ Hook ↔ Components

| API Field | Hook Interface | Component Usage | Match? |
|-----------|---------------|-----------------|--------|
| `kpis.revenue` | ✅ | ✅ DayKPIBar, KPICard, DayPerformanceCard | ✅ |
| `kpis.avgServiceTime` | ✅ | ✅ DayKPIBar | ✅ |
| `byZone[].avgServiceTime` | ✅ | ✅ ZoneRevenueChart (in props but not rendered) | ⚠️ Data passed but not displayed |
| `topCategories[].tipAvg` | ✅ | Not rendered in CategoryBreakdown | ⚠️ Data available but unused |
| `topCategories[].avgServiceTime` | ✅ | Not rendered in CategoryBreakdown | ⚠️ Data available but unused |
| `topCategories[].partySizeAvg` | ✅ | Not rendered in CategoryBreakdown | ⚠️ Data available but unused |
| `topProductByCategory[].productId` | ✅ | ✅ TopProductByCategoryChart | ✅ |
| `productsByCategory` (Record keyed by categoryId) | ✅ | ✅ TopProductsTable, CategoryBreakdown | ✅ |
| `categoryCompanions[]` | ✅ | ✅ CategoryCompanionsCard | ✅ |
| `topPerformersByCategory` (Record) | ✅ | ✅ CategoryPerformersCard, TopProductByCategoryChart | ✅ |
| `bottomPerformersByCategory` (Record) | ✅ | ✅ CategoryPerformersCard, TopProductByCategoryChart | ✅ |
| `shifts[]` | ✅ | ✅ ShiftReconciliation | ✅ |
| `byZonePayment[]` | ✅ | Not rendered in POSDashboardPanel | ⚠️ Data fetched but unused |
| `availableMonths` | ✅ | ✅ POSFiltersBar | ✅ |
| `filters.from` / `filters.to` | ✅ | ✅ Displayed in panel header | ✅ |

---

## 8. Products-Related Components Deep Dive

### 8.1 TopProductsTable (`TopProductsTable.tsx`)

**Data source in API:** `filteredProductRevenueMap` (line 552-568) — built from `allItems` after category filter  
**Props:** `data` (top 15 products), `selectedCategory`, `productsByCategory`

**Behavior:**
- When no category selected: shows `data.topProducts` (max 15)
- When category selected: shows `productsByCategory[selectedCategory]` (all products in that category, up to 50)
- Has expand/collapse for "Ver mas"

**Issue:** Category column always empty (see §6 above) — `label` is set to `productName` instead of `category`

### 8.2 TopProductByCategoryChart (`TopProductByCategoryChart.tsx`)

**Data source in API:** `topProductByCategory` (line 447-464) — #1 product per category  
**Props:** `data`, `selectedCategory`, `topPerformersByCategory`, `bottomPerformersByCategory`

**Behavior:**
- Shows horizontal bars per category with the top product
- When category selected, filters to that category and shows Top 2 / Bottom 2 performers

**Issue with empty data:** Returns `null` when `data.length === 0` — entire card disappears (no "Sin datos" placeholder)

### 8.3 CategoryBreakdown (`CategoryBreakdown.tsx`)

**Data source in API:** `topCategories` (line 421-433) — all categories sorted by revenue  
**Props:** `data`, `selectedCategory`, `productsByCategory`

**Behavior:**
- Shows top 15 categories with revenue bars
- Clicking a category selects it (filters other components) and expands inline product list from `productsByCategory`
- Products show mini revenue bars

**Empty data:** Shows "Sin datos" when `top15.length === 0`

### 8.4 CategoryPerformersCard (`CategoryPerformersCard.tsx`)

**Data source in API:** `topPerformersByCategory`, `bottomPerformersByCategory` (lines 493-512)  
**Props:** `topPerformersByCat`, `bottomPerformersByCat`, `categoryNames`, `categoryList`, `selectedCategory`

**Behavior:**
- Shows expandable accordion per category with Top 2 (green) and Bottom 2 (red) products
- Auto-expands selected category

**Issue:** Returns `null` when no categories with performers — card completely disappears with no placeholder. When `pos_sale_items` is empty for the period, this component won't render at all.

### 8.5 CategoryCompanionsCard (`CategoryCompanionsCard.tsx`)

**Data source in API:** `categoryCompanions` (lines 514-539) — pairs of categories in same cheques  
**Props:** `data` (array of category pairs with shared cheque counts)

**Behavior:**
- Shows top 15 category pairs with shared cheque counts

**Empty data:** Shows "Sin datos" when `data.length === 0` — ✅ proper fallback

---

## 9. API Route Quality Issues

### 9.1 fetchAll Helper (lines 27-72) — Unused!

The `fetchAll<T>` helper function is defined but **never called**. The API uses manual pagination loops instead. Dead code.

### 9.2 _in Filter Not Implemented in fetchAll

`fetchAll` skips `_in` and `_gte`/`_lte` keys in the `for` loop (lines 40-48) but they're handled separately. However, `fetchAll` is never called, so this is moot.

### 9.3 categorySaleIds Range Limitation

Lines 167-175: When fetching sale IDs for a category filter, the inner query uses `.range(0, BATCH - 1)` (limit 1000). If a category has products appearing in more than 1000 sale items, not all sale IDs will be found. This could cause the category filter to miss sales.

### 9.4 availableMonths Limited to 2000 Rows

Line 99: `.limit(2000)` on the months query. If there are more than 2000 paid, non-cancelled sales, some months may not appear in the selector. (Currently ~9700 sales, so months with >2000 early sales could be truncated.)

### 9.5 No Pagination on pos_product_groups

Line 699-702: Fetches all groups without pagination. If there are many product groups, this could be slow. Currently fine for expected data volumes.

### 9.6 clientTiers Not Date-Filtered

Lines 657-679: The `customer_stats` query has no date filter. It shows all-time tier data regardless of the selected period.

### 9.7 categoryList Filtering May Exclude Categories

Lines 703-707: `categoryList` only includes categories where `categoriesWithProducts.has(g.pos_group_id)`. This means categories with products but no sale items in the current period won't appear in the filter dropdown. This is correct behavior (don't show empty categories in filter) but could confuse users who know a category exists.

---

## 10. Hook Quality Issues

### 10.1 refetch Doesn't Use AbortController

`refetch` callback (lines 262-288) does not use AbortController, unlike the main `useEffect` fetch. If refetch is called while a previous refetch is in-flight, both run.

### 10.2 fetchDrillDown Not Blocked by Previous Drill-Down

`fetchDrillDown` (lines 290-316) doesn't cancel previous drill-down requests. If user clicks different drill-downs rapidly, results may arrive out of order.

---

## 11. Unused Components

| Component | Status |
|-----------|--------|
| **KPIRow** | Not imported/used in `POSDashboardPanel` (superseded by `DayKPIBar`) |
| **POSDailyTrendChart** | Not imported/used in `POSDashboardPanel` (superseded by `RevenueHeatmapCalendar` + `DayKPIBar`) |
| **NominaCostSection** | Not imported/used in `POSDashboardPanel` (separate nomina feature) |

---

## 12. Unused API Data

| API Response Field | Used in Components? |
|--------------------|--------------------|
| `byZonePayment` | ❌ Not rendered in any component |
| `topCategories[].tipAvg` | ❌ Computed but not displayed |
| `topCategories[].avgServiceTime` | ❌ Computed but not displayed |
| `topCategories[].partySizeAvg` | ❌ Computed but not displayed |
| `byZone[].avgServiceTime` | ❌ Passed to `ZoneRevenueChart` but not rendered |
| `hourlyRevenue[].tipTotal` | ❌ Fetched but not displayed |
| `hourlyRevenue[].cardPaidTotal` | ❌ Fetched but not displayed |
| `hourlyRevenue[].cashPaidTotal` | ❌ Fetched but not displayed |

---

## 13. Summary of Actionable Items

### P0 — Critical (Data showing empty)
1. **Import `cheqdet` into `pos_sale_items`** for all months (Jan-May 2026). This is the root cause of products/categories showing no data for non-April months. 882K cheqdet line items need to be matched to their `pos_sales` and inserted into `pos_sale_items`.

### P1 — Bugs
2. **TopProductsTable category column fix**: Change `label: p.productName` to `label: p.category` for the non-filtered path (line 53) so the Category column actually shows the category name.

### P2 — Hardcoded Dates
3. **NominaCostSection.tsx line 62**: Replace `'ABRIL 2026'` with dynamic period parameter (though this component isn't currently rendered in the POS panel).

### P3 — API Route Improvements
4. Fix `categorySaleIds` range limitation (line 173) — don't use `.range()` for this query, or paginate fully.
5. Increase `availableMonths` limit or use a `DISTINCT` approach to avoid limiting to 2000 rows.
6. Add date filtering to `clientTiers` query so it respects the selected period.
7. Remove unused `fetchAll` helper (dead code).

### P4 — UX Polish
8. **TopProductByCategoryChart**: Show a "Sin datos" placeholder instead of returning `null` when data is empty.
9. **CategoryPerformersCard**: Show a "Sin datos" placeholder instead of returning `null` when no performers data.
10. Display the unused enriched data: `byZone.avgServiceTime`, `topCategories.tipAvg`, `topCategories.avgServiceTime`, `topCategories.partySizeAvg`, `hourlyRevenue.tipTotal/cardPaidTotal/cashPaidTotal`.
11. Render `byZonePayment` in a component (data is fetched but never displayed).

### P5 — Hook Improvements
12. Add AbortController to `refetch` callback.
13. Add request cancellation to `fetchDrillDown` for rapid clicks.

---

## 14. Data Availability Matrix

| Component | Jan (2K+ cheques) | Feb (2K+) | Mar (2K+) | Apr (39) | May (2K+) |
|-----------|:--:|:--:|:--:|:--:|:--:|
| KPIs | ✅ | ✅ | ✅ | ✅ | ✅ |
| byZone | ✅ | ✅ | ✅ | ✅ | ✅ |
| hourlyRevenue | ✅ | ✅ | ✅ | ✅ | ✅ |
| dailyTrend | ✅ | ✅ | ✅ | ✅ | ✅ |
| staffPerformance | ✅ | ✅ | ✅ | ✅ | ✅ |
| paymentMethods | ✅ | ✅ | ✅ | ✅ | ✅ |
| clientSplit | ✅ | ✅ | ✅ | ✅ | ✅ |
| shifts | ✅ | ✅ | ✅ | ✅ | ✅ |
| **topProducts** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **topCategories** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **topProductByCategory** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **productsByCategory** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **categoryCompanions** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **topPerformersByCat** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **bottomPerformersByCat** | ❌ | ❌ | ❌ | ✅ | ❌ |
| clientTiers | ✅* | ✅* | ✅* | ✅* | ✅* |
| byZonePayment | ✅ | ✅ | ✅ | ✅ | ✅ |

*clientTiers has no date filter, always shows all-time data

✅ = Data available | ❌ = Empty (no `pos_sale_items` for that month)

---

## 15. Component-Level Prop-to-Render Detail

### TopProductsTable
- **Props flow:** `data.topProducts` → `displayData` array → `<table>` rows
- **Category filter path:** `productsByCategory[selectedCategory]` → alternate `displayData`
- **Rendering:** Table with #, Product Name, Category (broken, see §6), Qty, Revenue
- **Drill-down:** Row click → `onProductDrillDown(productId, productName)`

### TopProductByCategoryChart
- **Props flow:** `data` → `filteredData` (category filter) → `chartData` (top 12)
- **Rendering:** Horizontal bars with category name + #1 product name + qty + revenue
- **Filtered mode:** Shows single category + Top 2 (green) & Bottom 2 (red) performers

### CategoryBreakdown
- **Props flow:** `data.topCategories` → `top15` → rows with bars + inline products
- **Inline expand:** `productsByCategory[selectedId]` on category click
- **Rendering:** Color-coded bars + expandable product list with mini bars

### CategoryPerformersCard
- **Props flow:** `topPerformersByCat` + `bottomPerformersByCat` → `categoriesWithPerformers` (filtered from `categoryList`)
- **Rendering:** Accordion per category, expanded shows Trophy (top 2) + Warning (bottom 2)

### CategoryCompanionsCard
- **Props flow:** `data` → `top15` → table rows
- **Rendering:** Simple 3-column table: Category 1 + Category 2 + Shared Cheques

---

*End of audit report*