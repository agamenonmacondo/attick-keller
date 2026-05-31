# ProductRecipeDetail.tsx

- **Que hace**: Panel lateral (slide-in) con detalle de receta de un producto: ingredientes, costos, margen
- **Datos**: Recibe `ProductCostItem` con `ingredients[]`, `salePrice`, `recipeCost`, `marginPct`
- **Dependencias**: `formatCOPFull`, Phosphor `X`
- **Pitfalls**: Se cierra con Escape y click en overlay; margen <30% rojo, <50% amarillo, >=50% verde
