# nomina/[id]/novedades/route.ts

- **Que hace**: GET lista novedades del periodo; POST agrega novedad
- **Datos**: `novedades`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Novedades son tipos: falta, permiso, incapacidad, etc. Se vinculan por nomina_id