# SimulatorTab.tsx

- **Que hace**: Simulador de costos de nomina: configura equipo minimo por dia, preferencias de turnos, horas maximas, y calcula costo estimado
- **Datos**: useRodriData para employees; SimConfig local para parametros editables
- **Dependencias**: useRodriData, state local complejo
- **Pitfalls**: SHIFT_DEFS duplicado de AutoScheduleTab; calculos de costo usan recargo formulas colombianas
