# campaigns/route.ts

- **Que hace**: CRUD de campanas de email marketing (lista, crea, actualiza, elimina)
- **Datos**: `email_campaigns` (Supabase), `customer_tags` (para filtrar por segmento)
- **Auth**: `getAdminUser` — roles super_admin, store_admin, lider_area
- **Pitfalls**: POST usa `upsert` buscando por nombre+restaurant_id; campañas enviadas (status=sent) no se pueden reenviar sin duplicar