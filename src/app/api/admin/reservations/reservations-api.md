# reservations/route.ts

- **Que hace**: GET lista reservas con filtros (fecha, estado, busqueda); POST crea reserva manual (admin)
- **Datos**: `reservations`, `customers`, `tables`, `table_zones`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: GET con param `date`, `status`, `search`. POST puede asignar mesa manual o usar algoritmo. Envía email de confirmacion