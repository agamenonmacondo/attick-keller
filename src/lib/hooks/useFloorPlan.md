# useFloorPlan.ts

- **Que hace**: Fetches floor plan data (floors → zones → tables with reservation timeline). Supabase Realtime + 5-min polling.
- **Datos**: GET `/api/admin/floorplan?date=`; Supabase channel `floorplan-occupancy` on `reservations`
- **Returns**: `{ floors, unpositionedTables, loading, error, refetch }` — exports types TableWithPosition, FloorPlanZone, FloorPlanFloor, UnpositionedTable
- **Pitfalls**: 500ms debounce (slower than others, heavier payload); auto-computes Colombia date if none given