# TopProductsTable.tsx

- **Que hace**: Tabla de top productos (expandible de 10 a 15) con filtro por categoría y drill-down por producto
- **Datos**: Array de productos + `productsByCategory` opcional para filtrado
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`, Phosphor `CaretDown`
- **Pitfalls**: `console.warn` si categoría seleccionada no tiene productos en `productsByCategory` — puede ser key mismatch
