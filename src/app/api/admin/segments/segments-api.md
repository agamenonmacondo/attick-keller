# segments/route.ts

- **Que hace**: GET lista segmentos de clientes disponibles; POST crea nuevo segmento
- **Datos**: `customer_segments` (tabla de segmentos)
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: Los segmentos базicos (new, regular, vip, at_risk) son sistema y no se pueden eliminar