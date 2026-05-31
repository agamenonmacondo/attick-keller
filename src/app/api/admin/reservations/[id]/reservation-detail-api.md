# reservations/[id]/route.ts

- **Que hace**: GET detalle de reserva; PATCH actualiza estado/campos; DELETE cancela reserva
- **Datos**: `reservations`, `customers`, `tables`, `table_zones`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: PATCH permite cambio de estado (confirmed, seated, no_show, cancelled, completed). Cambio a seated auto-asigna mesa si no tiene