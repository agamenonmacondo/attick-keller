# pos-dashboard/detail/route.ts

- **Que hace**: Detalle de ventas por producto para el dashboard POS: breakdown por item, cantidades, revenue
- **Datos**: `pos_daily_sales`, `pos_products`, `menu_items`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Param `date=YYYY-MM-DD` requerido. Cruza pos_daily_sales con menu_items para nombres