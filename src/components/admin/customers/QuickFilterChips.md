# QuickFilterChips.tsx

- **Que hace**: Chips de filtro rapido para segmentar clientes: recurrente, tier (VIP/regular/ocasional/nuevo), ultima actividad y tiene email
- **Datos**: Recibe `filters` y `onChange` via props — estado gestionado por componente padre
- **Dependencias**: framer-motion, Phosphor icons, `cn`
- **Pitfalls**: Los chips de tier usan TIER_OPTIONS con clave `none` para "Sin actividad" que no corresponde a ningun tier real de la DB