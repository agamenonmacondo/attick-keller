# nomina/[id]/provisiones/route.ts

- **Que hace**: GET lista provisiones del periodo; POST agrega provision
- **Datos**: `provisiones`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Provisiones son cesantias, primas, interes de cesantias, vacaciones. Se calculan automaticamente si no se provee monto