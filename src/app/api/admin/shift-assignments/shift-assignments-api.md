# /api/admin/shift-assignments

- **Metodo**: PUT — batch update de asignaciones de turnos
- **Que hace**: Recibe array de asignaciones, las enriquece con `estimated_cost` (costo empresa real via `calcularCostoTurnoEmpresa`), borra las existentes del schedule, inserta las nuevas, actualiza `total_estimated_cost` en `shift_schedules`
- **Datos**:
  - Request body: `{ schedule_id, assignments: [{ employee_id, day_index, shift_code, entrada?, salida?, novedad?, turnante_nombre? }] }`
  - Response: `{ assignments: [...], total_estimated_cost: number }`
- **Tablas**: `shift_assignments` (delete + insert), `shift_schedules` (update total_estimated_cost), `pos_nomina_staff` (salarios), `shift_types` (codigos)
- **Pitfalls**:
  - Sanitiza salarios > 50M a 0 antes de pasarlos a `calcularCostoTurnoEmpresa()`
  - `isSunday` se determina con `weekDates[dayIndex]?.getDay() === 0`
  - Si el schedule esta publicado, notifica empleados afectados via email (fire-and-forget)
  - `salaryMap` se construye consultando `pos_nomina_staff` por los employee_ids del request

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Migrado a calcularCostoTurnoEmpresa() |
