# availability/route.ts

- **Que hace**: GET calcula slots de disponibilidad para una fecha y tamaño de grupo
- **Datos**: `tables`, `table_zones`, `table_combinations`, `reservations`, `availability`
- **Auth**: Usuario autenticado (customer) o staff (getStaffUser) — doble validacion
- **Pitfalls**: Requiere query params `date` (YYYY-MM-DD) y `party_size` (1-20). Usa algoritmo `checkAvailability`. Cache de 30s con s-maxage/stale-while-revalidate