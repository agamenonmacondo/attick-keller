# ProductMixTab.tsx

- **Que hace**: Tab de analisis de product mix: bar chart de ventas vs costo por mes, donut de categorias, tabla de productos top
- **Datos**: data.productMix[] con total_ventas, total_costo, productos[] por mes
- **Dependencias**: Recharts, useRodriData, formatCOP
- **Pitfalls**: Acumula categorias de todos los meses para topCats; monthIdx empieza en ultimo mes
