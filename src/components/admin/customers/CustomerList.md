# CustomerList.tsx

- **Que hace**: Tabla paginada de clientes con seleccion multiple, badges de tier, y acciones rapidas (ver detalle, WhatsApp)
- **Datos**: Recibe customers[], paginacion y seleccion via props; no consume APIs directamente
- **Dependencias**: TierBadge, EmptyState, Pagination, framer-motion
- **Pitfalls**: La seleccion por checkbox usa `Set<string>` inmutable — siempre crear nuevo Set en toggle para evitar referencias stale