# CategoryPerformersCard.tsx

- **Que hace**: Muestra top/bottom performers por categoría con toggle expandible por categoría
- **Datos**: `topPerformersByCat`, `bottomPerformersByCat`, `categoryNames` — drill-down de productos
- **Dependencias**: `SectionHeading`, Phosphor icons
- **Pitfalls**: `expandedCats` se auto-sincroniza con `selectedCategory`; si no hay performers, no renderiza categoría
