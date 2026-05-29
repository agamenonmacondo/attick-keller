# table-suggestion/route.ts

- **Que hace**: POST sugiere mesa para una reserva usando algoritmo de asignacion; PUT registra correccion de sugerencia (host override)
- **Datos**: `reservations`, `tables`, `table_zones`, `table_combinations`, `assignment_corrections`
- **Auth**: `getStaffUser` — host, admin o superior
- **Pitfalls**: POST requiere `reservation_id`; retorno incluye suggested_table_id, alternatives, score, breakdown. PUT recibe suggested vs actual table_id para feedback del algoritmo (FASE 6)