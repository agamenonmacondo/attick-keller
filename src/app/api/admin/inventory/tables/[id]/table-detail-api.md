# inventory/tables/[id]/route.ts

- **Que hace**: PATCH actualiza una mesa, DELETE elimina (soft: is_active=false)
- **Datos**: `tables`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: DELETE es soft-delete (pone is_active=false). PATCH acepta campos parciales