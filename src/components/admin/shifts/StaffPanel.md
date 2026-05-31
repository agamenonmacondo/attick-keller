# StaffPanel.tsx

- **Que hace**: Panel CRUD de staff por area con costos mensuales calculados (prestaciones + aportes patronales colombianos)
- **Datos**: GET /api/admin/staff?area=X; PATCH para activar; DELETE; calculo local costoEmpresaMensual
- **Dependencias**: Phosphor icons, formatCOP de costCalculator
- **Pitfalls**: costoEmpresaMensual tiene formula completa de prestaciones colombianas (prima, cesantias, vacaciones, aportes 52.522%+); AREAS hardcoded
