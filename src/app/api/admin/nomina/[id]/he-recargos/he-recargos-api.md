# nomina/[id]/he-recargos/route.ts

- **Que hace**: GET lista HE/recargos de un periodo; POST agrega HE/recargo
- **Datos**: `he_recargos`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Recargo asociado a periodo por `nomina_id`. Se calcula sobre horas extras del staff