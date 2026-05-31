# ShiftGrid.tsx

- **Que hace**: Grid semanal editable de asignaciones de turnos (empleado x dia) con alertas de conflictos y calculo de costos
- **Datos**: Props staff, shiftTypes, assignments, scheduleId, weekStr; sincroniza localGrid con assignments
- **Dependencias**: calcularCostoTurno/calcularCostoSemanal/formatCOP, LEGAL_PARAMS, DAY_NAMES, Phosphor icons
- **Pitfalls**: Sincroniza external assignments → localGrid via useEffect; conflict alerts por horas extra y turnos adyacentes
