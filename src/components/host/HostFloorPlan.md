# HostFloorPlan.tsx

- **Que hace**: Vista read-only del plano del restaurante para el panel Host, usando FloorPlanMap con readOnly=true
- **Datos**: Ningun prop — usa FloorPlanMap internamente
- **Dependencias**: FloorPlanMap de @/components/admin/floorplan/FloorPlanMap
- **Pitfalls**: Solo lectura — el host no puede arrastrar mesas ni editar; la interaccion se limita a ver quien esta sentado
