# pos-costs/route.ts

- **Que hace**: Calcula y lista costos de ingredientes y costos operativos del POS
- **Datos**: `pos_products`, `menu_item_ingredients`, `pos_daily_sales`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: Costos se calculan dinamicamente cruzando menu_item_ingredients con pos_products