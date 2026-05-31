# nomina-ddl/route.ts

- **Que hace**: GET devuelve estructura DDL (columnas, tipos) de las tablas de nomina para formateo dinámico del frontend
- **Datos**: Informa metadatos de columnas de `pos_nomina`, `pos_nomina_staff`, `novedades`, `he_recargos`, `propinas`, `provisiones`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area, nomina
- **Pitfalls**: Endpoint pesado, cachea en frontend. Retorna estructura completa de columnas con labels y tipos para renderizar forms