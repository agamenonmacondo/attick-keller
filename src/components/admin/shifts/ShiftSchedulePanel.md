# ShiftSchedulePanel

## Proposito
Panel principal de gestion de turnos del administrador. Permite crear, editar y publicar cronogramas semanales de turnos por area (cocina, barra, servicio). Incluye 4 tabs: Cronograma (grilla interactiva de turnos), Costos (estimacion de costos por semana), Horarios (CRUD de tipos de turno con vista timeline), y Personal (gestion del personal del area).

## Datos
- **GET /api/admin/shift-schedules?area=X&week_str=Y** — Carga datos del cronograma: schedule, assignments, staff, shift_types
- **POST /api/admin/shift-schedules** — Crea un nuevo cronograma (schedule) para area+semana
- **POST /api/admin/shift-schedules/{id}/publish** — Publica un cronograma (cambia status de draft a published)
- **PUT /api/admin/shift-assignments** — Guarda asignaciones de turnos (grid completo)
- **POST /api/admin/shift-schedules (action: create_shift_type)** — Crea tipo de turno via ShiftTypeEditor
- **PATCH /api/admin/shift-type** — Edita tipo de turno existente
- **DELETE /api/admin/shift-type?id=X** — Elimina tipo de turno
- **Tablas**: shift_schedules, shift_assignments, shift_types, pos_nomina_staff, staff_aliases
- **Workaround**: La API de shift-schedules hace multiples queries separadas (schedule + staff + shift_types + aliases) y merge manual en vez de joins

## Dependencias
- **Lo usa**: AdminShell (tab 'turnos')
- **Usa a**:
  - ShiftGrid — grilla interactiva de turnos
  - CostEstimationBar — barra de estimacion de costos
  - StaffPanel — panel de personal del area
  - ShiftTimelineView — vista timeline de horarios
  - SectionHeading — componente compartido de encabezados
  - calcularCostoTurno, getWeekStr, getWeekDates — utilidades de costCalculator
  - Tipos: ShiftType, StaffMemberForShift, ShiftAssignment de @/lib/types/shifts

## Pitfalls
- **Estado grid vs asignaciones**: La grilla se inicializa desde asignaciones cargadas por la API, pero el estado local `grid` se desincroniza si se guarda sin recargar. Siempre se llama `loadData()` despues de guardar para sincronizar.
- **Creacion de schedule implicita**: Si no existe `scheduleId`, handleSave primero crea el cronograma via POST y luego guarda las asignaciones. Si POST falla, no se guardan asignaciones — no hay transaccion atomica.
- **Turnos OFF se ignoran**: Al guardar, los turnos con codigo "OFF" se saltan (`if (!code || code === 'OFF') continue`). Si se renombra OFF, se rompe.
- **Calculo de costos por turno**: Usa `calcularCostoTurno()` que recibe salario_mensual y determina HE segun ordinarias+nocturnas > 8. Si el salario viene null/0 desde la API, el costo es 0.
- **Filtro de area sincronizado**: Cambiar area resetea los datos pero NO resetea la grilla local — se depende del useEffect en `loadData` para reemplazar el grid.
- **Publicacion sin validacion**: Publicar solo verifica que exista `scheduleId`, no valida que haya turnos asignados. Un cronograma vacio puede publicarse.
- **ShiftTypeEditor inline**: Es un componente hijo definido en el mismo archivo. No tiene memo ni keys estables — re-renderiza con cada cambio del padre.
- **confirm() para publish**: Usa browser `confirm()` nativo, no un modal custom. Bloquea UI en mobile.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-28 | Ninja | responsive: mobile-first design para ShiftGrid, CostEstimationBar, StaffPanel, ShiftTimelineView y ShiftSchedulePanel |
| 2026-05-28 | Ninja | refactor: eliminar tab Performance (duplicaba Costos), vista simultanea siempre visible en Horarios, sin toggle |
| 2026-05-28 | Ninja | feat: vista simultanea de turnos (timeline) en tab Horarios |
| 2026-05-28 | Ninja | fix: sync grid state in ShiftGrid, improve save error handling, reload after save |
| 2026-05-28 | Ninja | feat: editar y eliminar tipos de turno en panel Horarios + API endpoint |
| 2026-05-28 | Ninja | fix: modulo turnos — arreglar calculo HE, quitar apoyo del cronograma, agregar tab Personal |