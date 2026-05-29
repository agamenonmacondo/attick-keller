# useVIPInactive.ts

- **Que hace**: Fetches VIP customers who haven't visited in N days
- **Datos**: GET `/api/admin/customers/analytics/vip-inactive?days=`
- **Returns**: `{ data, loading, error }` — data typed as VIPInactiveResponse (from types/analytics)
- **Pitfalls**: Default days=30; no refetch function