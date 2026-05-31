# EquiposDiariosTab.tsx

- **Que hace**: Vista diaria de equipos por dia de la semana con badges de turno y costos calculados
- **Datos**: Recibe data de useRodriData — schedules + employees
- **Dependencias**: useRodriData, calcHours/calcCost/formatCOP
- **Pitfalls**: OFF_CODES (X, VAC, INC, FEST, vacio) no se muestran como trabajo; TURNO_STYLE hardcoded
