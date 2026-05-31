# dashboard/route.ts

- **Que hace**: Dashboard principal: reservas hoy, ocupacion, revenue, proximas reservas, alertas no-show
- **Datos**: `reservations`, `tables`, `customers`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Usa `getColombiaNow()` para fecha actual. Multiples queries en paralelo con Promise.all