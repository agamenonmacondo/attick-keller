# customers/analytics/trends/route.ts

- **Que hace**: Tendencias temporales: reservas por dia, revenue por dia, no-show rate, nuevos clientes
- **Datos**: `reservations`, `customers`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param `days=N` (default 30). Revenue = sum de prepayments. Client-side debe manejar dias sin datos (gaps en graficas)