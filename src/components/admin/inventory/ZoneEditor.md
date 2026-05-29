# ZoneEditor.tsx

- **Que hace**: Modal formulario para crear/editar zonas: nombre, descripcion y orden
- **Datos**: POST `/api/admin/inventory/zones` (crear), PATCH `/api/admin/inventory/zones` (editar)
- **Dependencias**: Tipo `Zone` de `@/lib/types/inventory`
- **Pitfalls**: `sort_order` default es 0 — si se crean multiples zonas sin cambiar el orden, todas quedan en 0 y el orden es indefinido