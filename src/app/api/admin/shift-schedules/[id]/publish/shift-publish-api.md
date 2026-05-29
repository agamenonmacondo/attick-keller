# shift-schedules/[id]/publish/route.ts

- **Que hace**: POST publica un cronograma draft (cambia status a published) y envía emails a todos los empleados asignados
- **Datos**: `shift_schedules`, `shift_assignments`, `shift_types`, `pos_nomina_staff`, `user_roles`, `staff_aliases`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**: Solo se pueden publicar cronogramas en status draft. Debe tener al menos 1 asignacion. Los emails se envian fire-and-forget (no bloquean la respuesta)