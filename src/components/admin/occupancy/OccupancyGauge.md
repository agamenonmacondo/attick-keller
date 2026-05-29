# OccupancyGauge.tsx

- **Que hace**: Gauge semicircular SVG mostrando porcentaje de ocupacion con color dinamico (oliva < 50%, ambar 50-80%, borgona > 80%) y detalle de mesas/asientos
- **Datos**: Recibe `percent`, `capacityPercent`, `occupied`, `total`, `guestsSeated`, `totalCapacity` via props
- **Dependencias**: AnimatedCard
- **Pitfalls**: Usa SVG con `strokeDashoffset` animado via useEffect — si `percent` cambia rapidamente, la transicion puedo no completarse antes de la proxima actualizacion