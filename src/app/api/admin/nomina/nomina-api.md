# nomina/route.ts

- **Que hace**: CRUD de periodos de nomina: GET lista/por_ID, POST crea, PATCH actualiza estado, DELETE elimina
- **Datos**: `pos_nomina`, `pos_nomina_staff`, `novedades`, `he_recargos`, `propinas`, `provisiones`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: El periodo tiene estados (draft, approved, paid). PATCH cambia estado pero no permite retroceder de paid a draft. Calculos de totales se hacen en memoria