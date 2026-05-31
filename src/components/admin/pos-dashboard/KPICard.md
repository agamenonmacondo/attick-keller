# KPICard.tsx

- **Que hace**: Card de KPI reutilizable con label, valor animado, icono y subtexto; exporta `formatCOPDisplay`
- **Datos**: Props puramente UI — `label`, `value`, `icon`, `subtext`, `format`
- **Dependencias**: `AnimatedCounter`
- **Pitfalls**: `formatCOPDisplay` se usa en ~20 componentes como helper de formato COP compacto ($1.2M, $890K)
