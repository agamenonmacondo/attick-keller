# useTableDemand.ts

- **Que hace**: Fetches table demand vs supply comparison (by party size bucket)
- **Datos**: GET `/api/admin/customers/analytics/table-demand`
- **Returns**: `{ data, loading, error }` — data typed as TableDemandComparison (from types/analytics)
- **Pitfalls**: No refetch function; single fetch on mount