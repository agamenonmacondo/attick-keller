# useTableSuggestion.ts

- **Que hace**: Fetches AI table assignment suggestion for a reservation (host clicks unassigned reservation)
- **Datos**: POST `/api/admin/table-suggestion` with `{ reservation_id }`
- **Returns**: `{ loading, result, error, suggest, clear }` — result is AssignmentResult from table-assignment algorithm
- **Pitfalls**: Manual trigger (not auto-fetch); call clear() to reset when popover closes