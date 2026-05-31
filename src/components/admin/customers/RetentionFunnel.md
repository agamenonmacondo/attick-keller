# RetentionFunnel.tsx

- **Que hace**: Embudo visual de retencion mostrando clientes por rango de visitas: 1 visita, 2-3, 4-5, 6-10, VIP (10+), con barras y porcentajes
- **Datos**: Recibe `retention` (oneTime, twoToThree, fourToFive, sixToTen, vip) y `total` via props
- **Dependencias**: AnimatedCard
- **Pitfalls**: Los colores de cada etapa estan hardcoded (danger, warning, dorado, success, borgona) — si se agregan mas rangos hay que actualizar el array STAGES