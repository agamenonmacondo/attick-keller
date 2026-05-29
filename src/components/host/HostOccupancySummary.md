# HostOccupancySummary.tsx

- **Que hace**: Cards animadas de resumen de ocupacion (total mesas, ocupadas, capacidad, % utilizacion) con animacion Framer Motion
- **Datos**: Props stats (reservas por estado), occupancy (mesas, capacidad, %), quickStats (optional)
- **Dependencias**: AnimatedCard, AnimatedCounter, usePrefersReducedMotion, Framer Motion
- **Pitfalls**: quickStats es opcional — sin el solo muestra occupancy; porcentajes se calculan como division directa
