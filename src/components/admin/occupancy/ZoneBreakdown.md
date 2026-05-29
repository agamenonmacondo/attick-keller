# ZoneBreakdown.tsx

- **Que hace**: Grid de tarjetas mostrando ocupacion por zona con barra de progreso y colores dinamicos (oliva < 50%, ambar 50-80%, borgona > 80%)
- **Datos**: Recibe `zones` (Array<Record<string, unknown>>) con zone_id, zone_name, total_tables, occupied_tables, capacity, occupied_capacity via props
- **Dependencias**: AnimatedCard, AnimatedCounter
- **Pitfalls**: Si `zones` esta vacio, muestra mensaje "Sin zonas configuradas" — no error boundary, solo UI fallback