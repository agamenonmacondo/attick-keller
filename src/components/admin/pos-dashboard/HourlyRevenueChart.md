# HourlyRevenueChart.tsx

- **Que hace**: BarChart de revenue y cheques por hora, con tooltip y click para drill-down
- **Datos**: Array `{hour, revenue, cheques}` desde `usePOSDashboard`
- **Dependencias**: Recharts, `SectionHeading`, `formatCOPDisplay`
- **Pitfalls**: `onHourDrillDown` es opcional; si está ausente las barras no son clickeables
