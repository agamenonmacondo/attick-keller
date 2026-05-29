# ConversionCard.tsx

- **Que hace**: Tarjeta mostrando tasa de conversion de reservas (confirmadas/total) con barra de progreso y porcentaje animado
- **Datos**: Recibe `pending`, `confirmed`, `rate` via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading, AnimatedCounter
- **Pitfalls**: El `rate` viene precalculado del backend — `confirmedPct` se recalcula localmente como `(confirmed/total)*100` y puede diferir del `rate` si las definiciones no coinciden