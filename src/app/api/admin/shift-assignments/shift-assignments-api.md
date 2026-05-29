# shift-assignments/route.ts

- **Que hace**: GET asignaciones de turnos; POST crea/actualiza asignaciones en batch
- **Datos**: `shift_assignments`, `shift_schedules`, `shift_types`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**: POST acepta array de asignaciones. Cada asignacion vincula schedule_id + employee_id + shift_code + day_index