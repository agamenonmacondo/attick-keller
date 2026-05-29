# SegmentTabs.tsx

- **Que hace**: Tabs horizontales para filtrar clientes por segmento: Todos, Nuevos, Ocasionales, Frecuentes, Habituales, VIP con contadores
- **Datos**: Recibe `counts` (all, nuevos, ocasional, frecuente, habitual, vip) y `active`/`onSelect` via props
- **Dependencias**: framer-motion, Phosphor icons, `cn`
- **Pitfalls**: `active` puede ser `null` (para "Todos") — el tab "Todos" se marca como activo cuando `active === null`