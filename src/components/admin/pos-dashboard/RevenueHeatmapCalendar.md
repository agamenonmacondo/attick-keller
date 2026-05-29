# RevenueHeatmapCalendar.tsx

- **Que hace**: Calendario heatmap tipo GitHub con métrica seleccionable (revenue/propina/cheques/personas), navegación de meses
- **Datos**: `dailyData[]` con fecha y métricas, `selectedDate`, `metric` seleccionable
- **Dependencias**: `SectionHeading`, Phosphor icons, `useTheme`
- **Pitfalls**: `getHeatLevel` usa percentiles q25/q50/q75 para colorear; `viewMonth` controla mes mostrado
