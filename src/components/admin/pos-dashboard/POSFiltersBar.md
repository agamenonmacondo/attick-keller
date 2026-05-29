# POSFiltersBar.tsx

- **Que hace**: Barra de filtros: rango de fechas (mes), categoría, zona. Transforma mes a from/to
- **Datos**: Recibe y emite `POSDashboardFilters` — `{from, to, category, zone}`
- **Dependencias**: Phosphor icons, tipos de `usePOSDashboard`
- **Pitfalls**: Zonas hardcodeadas por default (`Tipi`, `Attic`, `Chispas`); selección "all" borra `from`/`to`
