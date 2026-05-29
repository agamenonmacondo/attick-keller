# useHostDashboard.ts

- **Que hace**: Fetches host dashboard data (reservations, today stats, occupancy) using Colombia date auto-detection. 30s polling (fresher than admin).
- **Datos**: GET `/api/admin/dashboard?date=`; Supabase Realtime channel `host-dashboard`
- **Returns**: `{ data, loading, refetch }`
- **Pitfalls**: Uses `createDebouncedRefetch` utility; creates its own Supabase client (not the shared one); 30-second fallback interval (faster than admin's 5 min)