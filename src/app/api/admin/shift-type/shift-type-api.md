# shift-type/route.ts

- **Que hace**: PATCH actualiza tipo de turno; DELETE elimina tipo de turno
- **Datos**: `shift_types`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**: DELETE verifica que no haya asignaciones usando el tipo antes de eliminar