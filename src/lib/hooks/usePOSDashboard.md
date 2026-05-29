# usePOSDashboard.ts

- **Que hace**: Main POS analytics dashboard — KPIs, revenue by zone/hour/day, top products/categories, staff performance, payment methods, client tiers, and drill-down detail. AbortController for StrictMode race conditions.
- **Datos**: GET `/api/admin/pos-dashboard?zone=&category=&from=&to=`; GET `/api/admin/pos-dashboard/detail?type=&id=&from=&to=&zone=&category=`
- **Returns**: `{ data, loading, error, refetch, drillDown, drillDownData, drillDownLoading, drillDownError, fetchDrillDown, closeDrillDown }` — exports POSDashboardFilters, DrillDownType, DrillDownState, DrillDownData, POSDashboardData types
- **Pitfalls**: Does NOT clear data on re-fetch (prevents empty flash); uses `_t=${Date.now()}` cache-busting; aborts stale requests