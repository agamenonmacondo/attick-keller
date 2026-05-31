# shifts.ts

- **Que hace**: Define tipos para el sistema de turnos + constantes de ley laboral colombiana
- **Datos**: Tipos: ShiftType, StaffMemberForShift, ShiftAssignment, ShiftSchedule, ShiftNovedad, LEGAL_PARAMS (horas max, recargos, etc.)
- **Dependencias**: Usado por ShiftSchedulePanel, useShiftData, shift-schedules API, shift-checkin/checkout
- **Pitfalls**: LEGAL_PARAMS tiene valores hardcodeados (48h semana, 1h descanso por 8h, recargos 25%/75%/100%/110%). ShiftType tiene is_split para turnos partidos. shift_assignments usa JSON en columna data para turnos partidos.
