# product-costs/route.ts

- **Que hace**: GET lista costos por producto (ingrediente × receta), comparacion precio vs costo
- **Datos**: `menu_items`, `menu_item_ingredients`, `pos_products`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: Calcula costo_total como suma de ingredientes × cantidad. Cruza con pos_products para precios de compra