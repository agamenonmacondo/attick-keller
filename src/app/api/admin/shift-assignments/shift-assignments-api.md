# shift-assignments/route.ts

- **Que hace**: PUT batch de asignaciones de turnos para un cronograma. Borra todas las existentes e inserta las nuevas con costos estimados. Si el cronograma esta published, notifica por correo a los colaboradores afectados.
- **Datos**: `shift_assignments`, `shift_schedules`, `shift_types`, `pos_nomina_staff`, `email_log`, `staff_aliases`, `user_roles`
- **Auth**: `getStaffOrLeaderUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**:
  - Estrategia delete-all + insert: borra TODAS las asignaciones del schedule y reinserta. No es incremental.
  - **Salarios inflados causan numeric overflow**: Si `pos_nomina_staff.salario` es > 50,000,000 (ej: error de datos como Gibi con 172B), el calculo de `estimated_cost` desborda `numeric(10,2)` en PostgreSQL. Se sanitiza a 0 automaticamente.
  - **Notificacion solo si published**: Si el cronograma es `draft`, no se envian correos. Solo cuando ya esta `published` se comparan asignaciones anteriores vs nuevas y se notifica a empleados afectados.
  - **Notificaciones fire-and-forget**: Los correos se envian despues de responder la API. Si fallan, no afectan la respuesta.
  - **Deduplicacion**: `sendShiftChangeEmail` usa `email_log` con tipo `schedule_updated` para evitar duplicados.
  - `getWeekDates` aqui es una copia local (no usa la de `costCalculator.ts`). Usa hora local, no UTC — puede tener discrepancias en semanas ISO.

## Historial

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-30 | Ninja | feat: notificar por correo a colaboradores afectados al guardar cambios en turnos publicados |
| 2026-05-30 | Ninja | fix: sanitizar salario > 50M para prevenir numeric overflow en estimated_cost |
| 2026-05-30 | Ninja | fix: force-dynamic para evitar caching de Vercel |