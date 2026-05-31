# TablesPanel.tsx

- **Que hace**: Panel principal de inventario de mesas — lista mesas agrupadas por zona, maneja CRUD de zonas, mesas y combinaciones con modales
- **Datos**: Hook `useTableInventory` (APIs: GET `/api/admin/inventory/tables`, CRUD zones/tables/combinations)
- **Dependencias**: TableCard, ZoneEditor, TableEditor, CombinationEditor, AnimatedCard, SectionHeading, EmptyState, ConfirmDialog
- **Pitfalls**: El estado de edicion (`editingZone`, `editingTable`, `editingCombination`) es mutuamente excluyente — solo un modal a la vez. Despues de crear/eliminar, llama `refetch()` para sincronizar