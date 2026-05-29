# DayKPIBar.tsx

- **Que hace**: Grid de KPI cards para un día específico (revenue, cheques, ticket, propinas, personas, tarjeta, efectivo, service time), con indicador vs promedio
- **Datos**: Props `kpis` y `averages` — ambos tipo KPIs
- **Dependencias**: `AnimatedCounter`, Phosphor `TrendUp`/`TrendDown`/`Minus`
- **Pitfalls**: `DiffIndicator` solo se muestra si `isSingleDay && averages`; porcentajes se dividen por `avg` que puede ser 0
