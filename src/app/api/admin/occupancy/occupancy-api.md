# occupancy/route.ts

- **Que hace**: Ocupacion en tiempo real y historica: mesas ocupadas/libres, turnos activos, promedio por hora
- **Datos**: `reservations`, `tables`, `table_zones`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Usa `getColombiaNow()` para fecha actual. Calcula ocupacion como % de mesas con reserva activa (confirmed, seated, pre_paid)