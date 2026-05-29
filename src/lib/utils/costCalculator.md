# costCalculator.ts

- **Que hace**: Calcula costos laborales colombianos: salario mensual → hora, recargos, provisiones
- **Datos**: Funciones: calculateHourlyRate, calculateOvertimeRate, calculateProvisions, calculateTotalCost
- **Dependencias**: Usado por NominaPanel, POSCostPanel, shift-schedules API
- **Pitfalls**: Asume ley colombiana (auxilio transporte, cesantias, primas, vacaciones). Los porcentajes estan hardcodeados — sincronizar con LEGAL_PARAMS en shifts.ts
