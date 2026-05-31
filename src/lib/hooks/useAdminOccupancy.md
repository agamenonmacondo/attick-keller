# useAdminOccupancy.ts

- **Que hace**: Fetches occupancy data (zones with tables, unassigned, combinations) for a given date. Supabase Realtime + 5-min polling.
- **Datos**: GET `/api/admin/occupancy?date=`; Supabase channel `admin-occupancy` on `reservations`
- **Returns**: `{ data, loading, error, refetch }` — data includes zones, unassignedTables, combinations
- **Pitfalls**: 300ms debounce on Realtime events; filters by RESTAURANT_ID