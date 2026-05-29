# DayPerformanceCard.tsx

- **Que hace**: Card de rendimiento detallado por día: KPIs, zonas, top products, hourly revenue, staff performance
- **Datos**: Props con `kpis`, `byZone`, `topProducts`, `hourlyRevenue`, `staffPerformance`, `periodAverages`
- **Dependencias**: `AnimatedCounter`, `SectionHeading`, `formatCOPDisplay`, drill-down callbacks
- **Pitfalls**: `periodAverages` es opcional — sin él no se muestra indicador de tendencia
