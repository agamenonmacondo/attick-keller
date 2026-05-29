# CustomerFilters.tsx

- **Que hace**: Panel de filtros avanzados para lista de clientes: busqueda libre, filtro por tags, email, visitas minimas y dias desde ultima visita
- **Datos**: Recibe `tags` y `onApply` callback; no consume APIs directamente
- **Dependencias**: Iconos Phosphor, `cn` utility
- **Pitfalls**: Los filtros rapidos (`quickFilters`) se sincronizan bidireccionalmente con chips — evitar loops infinitos al propagar estado