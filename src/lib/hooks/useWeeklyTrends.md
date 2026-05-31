# useWeeklyTrends.ts

- **Que hace**: Fetches weekly customer trend data (active, new, no-show, reservations, retention)
- **Datos**: GET `/api/admin/customers/analytics/trends?weeks=`
- **Returns**: `{ data, loading, error }` — data typed as TrendResponse (from types/analytics)
- **Pitfalls**: Default weeks=8; no refetch function