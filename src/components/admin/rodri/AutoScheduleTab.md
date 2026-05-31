# AutoScheduleTab.tsx

- **Que hace**: Tab de generacion automatica de horarios con team demand per day, constraints y distribucion de turnos
- **Datos**: Hook useRodriData para employees, schedules, params; TEAM_HISTORICAL_DEMAND hardcodeado
- **Dependencias**: useRodriData, formatCOP, Phosphor icons
- **Pitfalls**: SHIFT_DEFS elimina P1/P2 (split shifts); demanda por dia/team esta hardcodeada, no viene de API
