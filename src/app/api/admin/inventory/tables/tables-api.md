# inventory/tables/route.ts

- **Que hace**: GET lista mesas, POST crea nueva mesa
- **Datos**: `tables`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: Al crear, si no se especifica `capacity_min`, se usa `capacity` como default