# menu/[id]/recipe/route.ts

- **Que hace**: GET obtiene receta de un item;PUT actualiza ingredientes/costos de la receta
- **Datos**: `menu_items` (con recipe JSONB), `menu_item_ingredients`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: La receta se almacena como JSONB en `menu_items.recipe`. PUT reemplaza toda la receta (no merge parcial)