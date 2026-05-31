# customers/analytics/table-demand/route.ts

- **Que hace**: Analiza demanda de mesas por zona/hora: ocupacion promedio, pico de demanda, heat map por zona
- **Datos**: `reservations`, `tables`, `table_zones`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param query `days=N` (default 30). Agrupa por zona y hora, calcula % ocupacion