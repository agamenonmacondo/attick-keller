# POSCostPanel.tsx

- **Que hace**: Panel de costos de producto: purchase trend chart, category breakdown, product catalog con heatmap calendar
- **Datos**: Hook `usePOSCosts` + `RevenueHeatmapCalendar` integrado
- **Dependencias**: Recharts, `AnimatedCard`, `SectionHeading`, `RevenueHeatmapCalendar`, `formatCOPDisplay`
- **Pitfalls**: Integra `HeatmapMetric` para el calendar; `formatCOPFull` vs `formatCOPShort` para tooltip vs cards
