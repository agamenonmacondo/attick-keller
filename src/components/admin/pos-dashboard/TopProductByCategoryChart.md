# TopProductByCategoryChart.tsx

- **Que hace**: Muestra el producto estrella por cada categoría con barras horizontales y drill-down
- **Datos**: `TopProductByCategory[]` + `topPerformersByCategory`/`bottomPerformersByCategory` opcionales
- **Dependencias**: `SectionHeading`
- **Pitfalls**: Si no hay datos muestra placeholder; `totalKpiRevenue` es opcional para calcular share%
