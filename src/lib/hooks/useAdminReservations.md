# useAdminReservations.ts

- **Que hace**: Fetches paginated reservations list with status filter. Supabase Realtime + 5-min polling.
- **Datos**: GET `/api/admin/reservations?date=&limit=100&status=`; Supabase channel `admin-reservations` on `reservations`
- **Returns**: `{ reservations, total, loading, error, refetch }`
- **Pitfalls**: Hard-coded limit=100; 300ms debounce on Realtime events