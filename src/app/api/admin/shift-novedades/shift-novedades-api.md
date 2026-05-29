# shift-novedades/route.ts

- **Que hace**: POST reporta novedad (falta, tarde, permiso, incapacidad) para un turno
- **Datos**: `shift_novedades`, `shift_assignments`
- **Auth**: `getAdminUser` o `getEmployeeUser` — empleados solo reportan propias; admins por cualquier empleado
- **Pitfalls**: Empleados deben reportar con ≥24hrs de anticipacion (admins no tienen esta restriccion). Envía email al lider de area