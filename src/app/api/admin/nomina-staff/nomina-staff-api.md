# nomina-staff/route.ts

- **Que hace**: GET lista personal de nomina; POST agrega nuevo miembro al staff
- **Datos**: `pos_nomina_staff`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: POST marca `activo=true` por defecto. `cedula` debe ser unica