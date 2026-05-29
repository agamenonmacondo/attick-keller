# PeakHoursChart.tsx

- **Que hace**: Grafico horizontal de barras mostrando ocupacion por hora con niveles de capacidad (Bajo/Medio/Alto/Pico), capacidad default 210 asientos, ~2 turnos
- **Datos**: Recibe `hours` (Array<{hour, count}>) y `totalCapacity` opcional via props del hook `useAdminMetrics`
- **Dependencias**: SectionHeading, `formatTime`
- **Pitfalls**: Los umbrales de capacidad estan hardcoded en CAPACITY_LEVELS (14%, 38%, 71%, 100%) — no son porcentajes reales de capacidad sino rangos fijos del max encontrado