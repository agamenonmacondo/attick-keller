# customers/route.ts

- **Que hace**: Lista y busca clientes con paginación, filtros por segmento/VIP/tags, y estadísticas agregadas (visits, no_shows, avg_spend)
- **Datos**: `customers`, `reservations`, `customer_tag_relations`, `customer_tags`
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Usa 3 queries separadas + merge manual (NO joins). `page_size` default 25, max 100. Stats se calculan en memoria tras fetch