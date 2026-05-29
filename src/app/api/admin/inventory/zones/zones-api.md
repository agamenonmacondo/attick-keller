# inventory/zones/route.ts

- **Que hace**: GET lista zonas, POST crea zona, PATCH actualiza, DELETE elimina
- **Datos**: `table_zones`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: DELETE falla si la zona tiene mesas asociadas ( restriccion FK)