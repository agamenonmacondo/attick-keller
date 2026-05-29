# nomina/ops-costs/route.ts

- **Que hace**: Calcula costos operativos por periodo: ingredientes, nomina, propinas, provisiones
- **Datos**: `pos_nomina`, `pos_nomina_staff`, `menu_item_ingredients`, `provisiones`, `propinas`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Agrega datos de multiples tablas para calcular costo total. Param `period_id` requerido