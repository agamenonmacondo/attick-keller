# DrillDownPanel.tsx

- **Que hace**: Panel lateral de drill-down con tabs (resumen, hourly, productos, staff) para una entidad (zona/categoría/producto/día)
- **Datos**: Usa `usePOSDashboard` hook para pedir `DrillDownData` vía filter adicional
- **Dependencias**: Recharts `BarChart`, `formatCOPDisplay`, Phosphor icons
- **Pitfalls**: Carga asíncrona del drill-down; si `drillDown` es null no renderiza nada
