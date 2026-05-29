# CategoryBreakdown.tsx

- **Que hace**: Barras horizontales de revenue por categoría de producto (top 15), con expansión de productos al hacer click
- **Datos**: Recibe `data` (categorías con revenue/cheques), `productsByCategory` — datos vienen de `usePOSDashboard`
- **Dependencias**: `SectionHeading`, `formatCOPDisplay` de `KPICard`
- **Pitfalls**: `selectedCategory='all'` baja opacidad de todas; `productsByCategory` puede tener keys vacíos si no hay drill-down
