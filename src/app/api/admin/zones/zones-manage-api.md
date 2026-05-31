# zones (admin)/route.ts

- **Que hace**: GET lista zonas de mesas para administracion
- **Datos**: `table_zones` (WHERE restaurant_id, ORDER BY sort_order)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Solo retorna id y name. Para CRUD completo usar inventory/zones