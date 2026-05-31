# shift-my-hours/route.ts

- **Que hace**: GET horas trabajadas del empleado autenticado (dia o rango)
- **Datos**: `shift_checkins`, `shift_assignments`, `shift_schedules`
- **Auth**: `getAdminUser` o `getEmployeeUser`
- **Pitfalls**: Calcula horas a partir de check_in/check_out times. Param `date=YYYY-MM-DD` o `start_date`+`end_date`