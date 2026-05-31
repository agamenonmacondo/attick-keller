# KPIStatsBar.tsx

- **Que hace**: Barra de 6 KPIs de clientes: total, recurrentes, visitas recientes 30/90 dias, gasto promedio, visitas totales con tasa de retencion
- **Datos**: Recibe props numericas (total, recurring, recent30, recent90, avgSpendPerVisit, totalVisits)
- **Dependencias**: AnimatedCard
- **Pitfalls**: Calcula `retentionRate` y `recentPct` en el cliente — si `total` es 0, retorna '0'