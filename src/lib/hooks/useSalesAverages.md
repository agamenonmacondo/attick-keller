# useSalesAverages.ts

- **Que hace**: Hook cliente que fetchea datos historicos de ventas desde `/api/admin/sales-averages` para calcular medianas por dia de la semana
- **Datos**: Fetch a API interna, no consulta BD directamente. Retorna `{ data: SalesAverages | null, loading: boolean }`
- **Interfaz `SalesAverages`**:
  - `days[]`: DayOfWeekAverage con `day_index` (0=Dom..6=Sab), `day_name`, `median`, `avg`, `q1`, `q3`, `tx_avg`, `tip_avg`, `count`
  - `weekly_total`: `avg_per_week`, `median_per_week`, `sum_of_medians`, `total_days`, `total_revenue`
- **Dependencias**: useEffect con array vacio (se ejecuta una sola vez al montar)
- **Pitfalls**:
  - `sum_of_medians` se agrego Jun 2026 para que la fila TOTAL de Referencia coincida con la suma visual de medianas diarias
  - Si la API falla, `setLoading(false)` se ejecuta igual (sin datos)

| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-06-02 | Ninja | Creacion del doc. Agregado sum_of_medians |
