# useAdminMetrics.ts

- **Que hace**: Fetches aggregate metrics (peak hours, sources, conversion rate, no-show rate, avg party size, daily trend)
- **Datos**: GET `/api/admin/metrics`
- **Returns**: `{ data, loading, error, refetch }` — data typed as MetricsData
- **Pitfalls**: No Realtime subscription; single fetch only. Call refetch manually when needed