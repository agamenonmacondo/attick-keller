# ShiftTimelineView.tsx

- **Que hace**: Timeline visual de turnos por area (cocina/barra/servicio) con barras horizontales de 6am a 6am
- **Datos**: Props shiftTypes[], area string
- **Dependencias**: Tipos ShiftType de @/lib/types/shifts
- **Pitfalls**: AREA_COLORS hardcoded para cocina/barra/servicio; TIMELINE_START=6, TIMELINE_END=30 (6am siguiente dia)
