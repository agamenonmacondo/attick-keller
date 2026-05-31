# dates-with-reservations/route.ts

- **Que hace**: Devuelve lista de fechas que tienen reservas (para picker de calendario)
- **Datos**: `reservations` — DISTINCT date WHERE status != cancelled
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param query `month=YYYY-MM` filtra por mes; sin param devuelve todo