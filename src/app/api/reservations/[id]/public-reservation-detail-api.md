# reservations/[id] (public)/route.ts

- **Que hace**: GET detalle de reserva por ID (verifica ownership o admin)
- **Datos**: `reservations`, `customers`, `user_roles` (via Supabase REST)
- **Auth**: Usuario autenticado (owner de la reserva) o admin (super_admin, store_admin)
- **Pitfalls**: Usa Supabase REST API directamente (fetch) en vez de client SDK. Verifica que customer.auth_user_id === user.id o que el rol sea admin