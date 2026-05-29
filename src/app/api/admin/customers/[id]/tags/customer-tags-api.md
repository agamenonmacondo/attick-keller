# customers/[id]/tags/route.ts

- **Que hace**: GET lista tags de un cliente; POST asigna/remueve tags en batch
- **Datos**: `customer_tag_relations`, `customer_tags`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: POST espera `{ tag_ids: string[] }` para agregar y `{ remove_tag_ids?: string[] }` para quitar; ambas operaciones ocurren en la misma llamada