# useAdminDashboard.ts

- **Que hace**: Fetches admin dashboard data (reservations, today stats, occupancy) for a given date. Uses Supabase Realtime + 5-min fallback polling.
- **Datos**: GET `/api/admin/dashboard?date=`; Supabase channel `admin-dashboard` on `reservations` table
- **Returns**: `{ data, loading, error, refetch }` — data includes reservations, todayStats, occupancy
- **Pitfalls**: Realtime subscription filters by `RESTAURANT_ID`; 300ms debounce on refetch to avoid rapid re-renders