# NominaCostSection.tsx

- **Que hace**: Sección de costos de nómina: KPIs de costo total, ratio nómina/revenue, gauges SVG, desglose por equipo
- **Datos**: Hook `useNominaOpsCosts` — llama APIs de nómina y operaciones
- **Dependencias**: `AnimatedCard`, Phosphor icons, `formatCOP` local
- **Pitfalls**: `useNominaOpsCosts` trae datos pesados; si falla una API el gauge puede quedar vacío; `warn` flag en RatioGauge cambia colores
