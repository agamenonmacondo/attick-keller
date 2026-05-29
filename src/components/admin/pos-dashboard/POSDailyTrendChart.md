# POSDailyTrendChart.tsx

- **Que hace**: Bar chart de revenue/propina/cheques por día con click para ver detalle del día
- **Datos**: Array `{date, revenue, cheques, propina}` desde `usePOSDashboard`
- **Dependencias**: Recharts, `SectionHeading`, `formatCOPDisplay`
- **Pitfalls**: `onDayClick` es opcional — sin él no hay navegación; fecha se formatea como día numérico solo
