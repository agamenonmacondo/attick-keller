# inventory.ts

- **Que hace**: Define interfaces para zonas, mesas y combinaciones
- **Datos**: Tipos: Zone, Table, Combination, TableUpdate, CombinationCreate/Update
- **Dependencias**: Usado por useTableInventory, TablesPanel, TableEditor, ZoneEditor
- **Pitfalls**: Table.capacidad es number, Combination.tables es array de IDs
