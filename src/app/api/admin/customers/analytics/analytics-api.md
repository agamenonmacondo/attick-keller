# customers/analytics/route.ts

- **Que hace**: Dashboard analítico de clientes: totales, nuevos del mes, VIPs, tasa de retorno, distribucion por segmento
- **Datos**: `customers`, `reservations`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Calcula `return_rate` como % de clientes con >1 reserva. Usa date_trunc para agrupar por mes