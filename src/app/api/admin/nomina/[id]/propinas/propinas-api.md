# nomina/[id]/propinas/route.ts

- **Que hace**: GET lista propinas del periodo; POST registra propinas
- **Datos**: `propinas`
- **Auth**: `getAdminUser` — roles super_admin, store_admin, nomina
- **Pitfalls**: Propinas se distribuyen por empleado dentro del periodo