# floorplan/route.ts

- **Que hace**: CRUD completo del floorplan: GET lista zonas con mesas, POST/PUT/PATCH/DELETE gestion de zonas y posicion de mesas
- **Datos**: `table_zones`, `tables`, `floor_plan_configs`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: PUT rearranja orden de mesas en una zona. DELETE de zona desasocia mesas primero. Las posiciones se guardan en `floor_plan_configs` como JSON