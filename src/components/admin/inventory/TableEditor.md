# TableEditor.tsx

- **Que hace**: Modal formulario para crear/editar mesas: numero, capacidad, capacidad minima, nombre attick, zona, combinable y grupo de combinacion
- **Datos**: POST `/api/admin/inventory/tables` (crear), PATCH `/api/admin/inventory/tables` (editar)
- **Dependencias**: Tipos `Table`, `Zone` de `@/lib/types/inventory`
- **Pitfalls**: `capacity_min` default es 2 (no igual a `capacity`) — si se crea mesa sin tocar, la capacidad minima queda desalineada con la capacidad principal