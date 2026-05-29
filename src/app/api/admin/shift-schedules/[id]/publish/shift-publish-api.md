# shift-schedules/[id]/publish/route.ts

- **Que hace**: POST publica un cronograma (cambia status a published) y envia emails. Acepta tanto draft como published (re-publicacion)
- **Datos**: `shift_schedules`, `shift_assignments`, `shift_types`, `pos_nomina_staff`, `user_roles`, `staff_aliases`, `email_log`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area

## Pitfalls
- Re-publicar (schedule ya published) manda email tipo 'schedule_updated' a todos los asignados, no 'schedule_published'
- Deduplicacion por email_log: type + recipient_email + schedule_id. Primera publicacion y actualizacion son tipos diferentes, no se bloquean entre si
- No hay restriccion de draft vs published — se puede publicar y re-publicar libremente
- Si falla el envio de email, la publicacion NO falla (fire-and-forget)

## Historial
| Fecha | Agente | Cambio |
| 2026-05-29 | Ninja | Permitir re-publicacion + email de actualizacion separado |