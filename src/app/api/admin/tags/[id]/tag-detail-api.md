# tags/[id]/route.ts

- **Que hace**: PATCH actualiza tag (nombre, color, descripcion, sort_order); DELETE elimina tag
- **Datos**: `customer_tags`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: DELETE no elimina las relaciones en customer_tag_relations (queda orfano el tag en clientes)