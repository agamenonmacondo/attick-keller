# useNoShowToday.ts

- **Que hace**: Fetches today's no-show risk alerts for reservations
- **Datos**: GET `/api/admin/customers/analytics/no-show-today?date=`
- **Returns**: `{ data, loading, error }` — data typed as NoShowTodayResponse (from types/analytics)
- **Pitfalls**: No refetch function — re-fetches on date change via useEffect dependency