# pos-calendar/route.ts

- **Que hace**: GET devuelve datos de calendario ventas POS por dia de la semana
- **Datos**: `pos_daily_sales`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Agrupa por day_of_week. Param `days=N` para rango (default 30)