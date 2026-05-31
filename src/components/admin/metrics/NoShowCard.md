# NoShowCard.tsx

- **Que hace**: Tarjeta mostrando tasa de no-asistencia con porcentaje animado y texto descriptivo
- **Datos**: Recibe `total`, `noShows`, `rate` via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading, AnimatedCounter
- **Pitfalls**: Componente muy simple (22 lineas) — `rate` viene precalculado del backend