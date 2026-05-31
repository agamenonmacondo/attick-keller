# useHostOccupancy.ts

- **Que hace**: Fetches real-time occupancy with per-table reservation timelines and urgency levels. Computes zone summaries and quick stats client-side.
- **Datos**: GET `/api/admin/occupancy?date=`; Supabase channel `host-occupancy` on `reservations`; 30s fallback polling
- **Returns**: `{ data, loading, refetch, zoneSummaries, quickStats }` — exports types Zone, TableItem, OccupancyData, ReservationTimeline
- **Pitfalls**: Uses UrgencyLevel from utils/urgency; zoneSummaries/quickStats are computed from raw data (seated current + seated upcoming = occupied; upcoming non-seated = reserved); creates its own Supabase client