# TeamPanel

## Proposito
Panel de gestion del equipo (staff). Muestra un formulario para agregar personal (por email + rol + empleado de nomina + area) y una lista del equipo existente con opciones para activar/desactivar y eliminar miembros. Es el entry point para la gestion de roles dentro del admin.

## Datos
- **GET /api/admin/staff** — Lista todo el personal con roles, emails y estado activo
- **POST /api/admin/staff** — Agrega un rol a un usuario existente (por email), requiere pos_nomina_staff_id para roles lider_area/colaborador/reservante
- **PATCH /api/admin/staff/{id}** — Activa/desactiva un miembro (toggle is_active)
- **DELETE /api/admin/staff/{id}** — Elimina un registro de rol
- **Tablas**: user_roles (CRUD directo), auth.users (lectura via admin API para emails)
- **Workaround**: El email se obtiene via `sb.auth.admin.listUsers()` porque la tabla user_roles no tiene email — se arma un emailMap en memoria cruzando IDs.

## Dependencias
- **Lo usa**: AdminShell (tab 'equipo')
- **Usa a**:
  - StaffList — componente de lista de personal con toggle activo y delete
  - AddStaffForm — formulario para agregar personal
  - AnimatedCard — componente de animacion de entrada

## Pitfalls
- **Re-fetch completo despues de cada accion**: handleAddStaff, handleToggleActive y handleDelete todos llaman `fetchStaff()` al completar. No hay optimistic update — el usuario ve un lag despues de cada accion.
- **handleAddStaff lanza error sin catch**: Si la API responde con status no-ok, lanza `throw new Error(...)`. El componente no tiene try/catch, asi que el error se propaga sin control si AddStaffForm no lo maneja.
- **handleToggleActive y handleDelete ignoran errores**: Usan `if (res.ok)` pero no hacen nada si falla. Cambios quedan en limbo sin feedback al usuario.
- **StaffMember type definido localmente**: La interfaz StaffMember esta definida dentro del mismo archivo en vez de importarse desde @/lib/types. Si StaffList o AddStaffForm definen su propia version, pueden desincronizarse.
- **Relacion con nomina**: pos_nomina_staff_id es opcional en la interfaz, pero obligatorio a nivel API para roles lider_area/colaborador/reservante. El formulario AddStaffForm debe validar esto antes de enviar.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | fix: vincular colaborador/lider con empleado de nomina + corregir desfase de fechas en mi-turno + labels roles + API pos-nomina-staff |
| 2026-05-28 | Ninja | fix: panel equipo con pos_nomina_staff_id y area para colaboradores + API actualizados |
| 2026-05-20 | Ninja | feat: dark mode completo - ThemeProvider, CSS vars, toggle Sun/Moon |