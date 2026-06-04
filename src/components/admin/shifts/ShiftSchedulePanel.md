# ShiftSchedulePanel.tsx

- **Que hace**: Panel principal de gestion de turnos. Contiene 5 tabs: Cronograma, Costos, Referencia, Horarios, Personal. Maneja navegacion entre semanas, guardado/publicacion de cronogramas
- **Datos**: 
  - Estado local: `area`, `tab`, `weekStr`, `shiftTypes`, `staff`, `assignments`, `grid`, `scheduleId`, `scheduleStatus`
  - API: `/api/admin/shift-schedules?area=&week_str=` para cargar datos por area
  - Modo "todos": fetch paralelo de las 3 areas (cocina/barra/servicio) con deduplicacion de shift types
- **Dependencias**: `calcularCostoTurnoEmpresa`, `getWeekStr`, `getWeekDates`, `dayIndexToDateIndex`, Phosphor icons, `ShiftGrid`, `CostEstimationBar`, `SalesReferenceTab`, `ShiftTypeModal`, `StaffPanel`, `ShiftTimelineView`
- **Flujo**:
  1. Carga datos via `loadData()` → useEffect
  2. Usuario asigna turnos en ShiftGrid → grid cambia via `onGridChange`
  3. `handleSave`: construye payload con `calcularCostoTurnoEmpresa()`, envia PUT a `/api/admin/shift-assignments`
  4. `handlePublish`: igual que save + PATCH schedule status = 'published'
- **Pitfalls**:
  - Navegacion de semanas es aritmetica pura sobre weekStr (sin Date). week 1 → year-1 week 52.
  - `isWeekEditable`: solo permite editar semana actual o futuras
  - Modo "todos" fuerza tab='costos' via useEffect
  - `calcularCostoTurnoEmpresa` se usa al guardar para persistir `estimated_cost` correcto

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Migrado a calcularCostoTurnoEmpresa(). Badge 'Sin cronograma' usa vars de tema |
