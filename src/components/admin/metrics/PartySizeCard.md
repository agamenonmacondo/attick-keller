# PartySizeCard.tsx

- **Que hace**: Tarjeta mostrando promedio de personas por reserva con contador animado
- **Datos**: Recibe `average` (numero) via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading, AnimatedCounter
- **Pitfalls**: Componente muy simple (18 lineas) — muestra "p" como sufijo de personas; el promedio viene del backend ultimos 30 dias