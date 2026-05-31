# useShiftData.ts

- **Que hace**: Loads shift types, staff for an area, and schedule/assignments for a week. Queries Supabase directly (not through API routes).
- **Datos**: Supabase tables: `shift_types`, `pos_nomina_staff` (sede=C75, area filter), `staff_aliases`, `shift_schedules`, `shift_assignments`
- **Returns**: `{ shiftTypes, areaShiftTypes, schedule, assignments, staff, loading, error, refresh }`
- **Pitfalls**: Filters staff by area OR secondary_areas (Uses `.or()` with `cs` array operator for secondary_areas); hard-coded sede='C75'; loads aliases from separate table and enriches staff