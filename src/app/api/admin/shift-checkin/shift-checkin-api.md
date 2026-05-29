# shift-checkin/route.ts

- **Que hace**: POST registra check-in de un empleado a su turno; GET verifica estado de check-in
- **Datos**: `shift_checkins`, `shift_assignments`
- **Auth**: `getAdminUser` o `getEmployeeUser` (colaborador/lider_area)
- **Pitfalls**: Empleado solo puede hacer check-in en su propio turno. Validacion contra schedule activo y turno asignado