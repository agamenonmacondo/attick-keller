# CombinationEditor.tsx

- **Que hace**: Modal para crear/editar combinaciones de mesas — seleccionar mesas combinables, nombre y capacidad resultante
- **Datos**: POST/PATCH `/api/admin/inventory/combinations` con `{name, table_ids, capacity}`
- **Dependencias**: Tipo `Table`, `Combination` de `@/lib/types/inventory`
- **Pitfalls**: Filtra solo `can_combine` tables para la seleccion — mesas sin ese flag no aparecen como opciones