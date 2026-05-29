# ProductCostTable.tsx

- **Que hace**: Tabla expandible de productos por categoría con margen%, costo de receta, precio de venta. Búsqueda y sort
- **Datos**: Hook `useProductCostCatalog` — productos, categorías, ingredientes
- **Dependencias**: `formatCOPFull` de `@/lib/utils/formatCurrency`, Phosphor icons
- **Pitfalls**: `expandedCategories` es Set local; sorting por `marginPct` puede mezclar categorías sin receta (-1)
