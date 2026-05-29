# metrics/route.ts

- **Que hace**: Metricas semanales: ocupacion, revenue, reservas, ticket promedio, no-show rate
- **Datos**: `reservations`, `pos_daily_sales` (si existe)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param `days=N` (default 7). Revenue calculado de `reservations.prepayment_amount` si `pos_daily_sales` no existe