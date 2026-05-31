# pos-dashboard/route.ts

- **Que hace**: Dashboard principal POS: ventas por dia/semana/mes, productos top, comparativas
- **Datos**: `pos_daily_sales`, `pos_products`, `reservations`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Endpoint pesado con multiples queries paralelas. Param `period=today|week|month`