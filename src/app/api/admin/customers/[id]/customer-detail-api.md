# customers/[id]/route.ts

- **Que hace**: Obtiene, actualiza o elimina un cliente individual por ID
- **Datos**: `customers` (Supabase)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: DELETE hace soft-delete poniendo `is_active=false`; PATCH permite campos parciales