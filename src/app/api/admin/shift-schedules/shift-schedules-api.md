# /api/admin/shift-schedules

- **Metodos**: GET, POST, PATCH
- **Que hace**: CRUD de cronogramas semanales de turnos por area
- **Datos**: Tablas `shift_schedules`, `shift_assignments`, `shift_types`, `pos_nomina_staff`, `staff_aliases`
- **GET**:
  - Query params: `?area=cocina|barra|servicio&week_str=2026-W23`
  - Retorna: `{ schedule, staff, shift_types, assignments }`
  - `staff` incluye: id, alias, area, secondary_areas (array), salario_mensual, cargo, contrato
  - `assignments` incluye: employee_id, day_index, shift_code, estimated_hours, estimated_cost
- **POST**: Crea schedule con `status='draft'` y `week_str`, `area`
- **PATCH**: Actualiza `status` (draft → published) y `total_estimated_cost`
- **Pitfalls**:
  - Staff se filtra por area O secondary_areas (usa operador `cs` de Supabase en JSONB)
  - `staff_aliases` se carga por separado y se enriquece en el response
  - Las asignaciones se devuelven con los costos estimados tal cual estan en BD

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc |
