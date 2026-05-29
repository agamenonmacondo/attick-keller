# shift-my-week/route.ts

- **Que hace**: GET cronograma semanal del empleado autenticado con sus asignaciones
- **Datos**: `shift_schedules`, `shift_assignments`, `shift_types`, `pos_nomina_staff`, `staff_aliases`
- **Auth**: `getAdminUser` o `getEmployeeUser` — empleado ve solo su semana; admin puede ver por employee_id
- **Pitfalls**: Param `week_str=YYYY-WXX` requerido (formato ISO). Empleados ven solo cronogramas published