# ShiftGrid.tsx

- **Que hace**: Grilla de asignacion de turnos (Cronograma). Muestra empleados como filas y dias (Lun-Dom) como columnas con dropdowns para seleccionar shift_code
- **Datos**: Props `staff`, `shiftTypes`, `grid` (controlled state), `onGridChange`, `readOnly`, `weekStr`, `scheduleId`
- **Dependencias**: `calcularCostoTurnoEmpresa`, `formatCOP`, `getWeekDates`, `dayIndexToDateIndex`, `dateToDayIndex`, `LEGAL_PARAMS`, Phosphor icons (Warning, ClockAfternoon, Coffee)
- **Secciones**:
  1. Alertas globales: overtime diario/semanal, sin dia de descanso
  2. Tarjetas mobile: select por dia para cada empleado con horas y costo total
  3. Tabla desktop: filas con dropdowns por dia, columna Horas y Costo est., footer TOTAL AREA
- **Logica**:
  - `employeeStats`: calcula horas diarias/semanales, costo empresa, alertas, desglose por empleado
  - `areaTotals`: suma de horas, costo, base, RN, RD, HE
  - `handleCellChange`: actualiza grid inmutablemente via `onGridChange`
- **Pitfalls**:
  - `COLUMNS` tiene `dayIndex` de BD (0=Dom, 1=Lun..6=Sab) pero se muestran en orden Lun..Dom
  - Las fechas del calendario usan `dayIndexToDateIndex()` porque `getWeekDates()` retorna Lun=0
  - `SUNDAY_DAY_INDEX = 0` en BD
  - `getCellBg`: heatmap basado en horas vs LEGAL_PARAMS (rojo si overtime, ambar si sin descanso)
  - `shiftOptions` incluye 'OFF' (Descanso) como opcion 0

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Migrado a calcularCostoTurnoEmpresa() |
