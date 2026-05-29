# pos-upload/route.ts

- **Que hace**: POST sube archivo CSV/XLSX de ventas POS y lo importa a pos_daily_sales
- **Datos**: `pos_daily_sales`, `pos_products` (para mapeo de nombres)
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: Parsea archivo con xlsx library. Validaciones de formato (fecha, montos). Retorna resumen de filas OK vs errores