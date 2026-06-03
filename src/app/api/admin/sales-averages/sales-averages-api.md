# /api/admin/sales-averages

- **Metodo**: GET
- **Que hace**: Calcula estadisticas historicas de ventas desde `pos_sales`: mediana, Q1, Q3, promedio por dia de la semana, y mediana semanal
- **Datos**:
  - Source: tabla `pos_sales` (todas, paginadas de 1000 en 1000)
  - Filtra: `is_cancelled = false`
  - Agrupa por dia (fecha Colombia via `Intl.DateTimeFormat('America/Bogota')`)
  - Agrupa por semana ISO
- **Response**: 
  ```json
  {
    "days": [{ "day_index": 1, "day_name": "Lun", "median": 5885933, "q1": 5003827, "q3": 8753778, "tx_avg": 24.5, ... }],
    "weekly_total": { "avg_per_week": N, "median_per_week": N, "sum_of_medians": N, "total_days": N, "total_revenue": N, "total_weeks": N }
  }
  ```
- **Pitfalls**:
  - `sum_of_medians`: suma de las 7 medianas diarias (Lun+Mar+...+Dom). Se agrego Jun 2026 para la fila TOTAL de Referencia
  - `MIN_DAILY_REVENUE = 100_000`: dias con revenue < 100K se consideran cerrados y se excluyen de las estadisticas de dia abierto
  - `percentile()` usa interpolacion lineal entre vecinos
  - Dias sin ventas se rellenan con revenue=0 para mantener el mapa completo

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc. Agregado sum_of_medians |
