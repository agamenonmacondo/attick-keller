# inventory/combinations/route.ts

- **Que hace**: CRUD de combinaciones de mesas (table_combinations): GET lista, POST crea, PUT actualiza, DELETE elimina
- **Datos**: `table_combinations`, `tables`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: `table_ids` es un array JSONB. El validador verifica que todas las mesas existan antes de crear la combinacion