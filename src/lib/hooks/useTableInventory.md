# useTableInventory.ts

- **Que hace**: Full CRUD for table inventory (zones, tables, combinations). Supabase Realtime on 3 tables + 5-min polling. Also provides mutation functions.
- **Datos**: Parallel GET `/api/admin/inventory/{zones,tables,combinations}`; PATCH/DELETE per endpoint; Realtime on `tables`, `table_zones`, `table_combinations`
- **Returns**: `{ data, loading, error, refetch, toggleTable, updateTable, deleteTable, batchUpdateTables, createCombination, updateCombination, deleteCombination, createZone, updateZone, deleteZone }`
- **Pitfalls**: 300ms debounce on Realtime; all mutations call refetch() after success; uses `RESTAURANT_ID` filter