# customers/segment-counts/route.ts

- **Que hace**: Devuelve conteo de clientes por segmento (new, regular, vip, at_risk)
- **Datos**: `customers` — GROUP BY segment, COUNT
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Segmentos se calculan por campos directos en la tabla, no por logica de negocio