# debounceRefetch.ts

- **Que hace**: Hook para debounced refetch en suscripciones Realtime de Supabase
- **Datos**: Exporta useDebouncedRefetch(callback, delay)
- **Dependencias**: Usado por hooks con Realtime (useAdminOccupancy, useFloorPlan, useTableInventory)
- **Pitfalls**: El delay por defecto es 500ms — ajustar dependiendo de la sensibilidad del componente
