# menu/categories/[id]/route.ts

- **Que hace**: PATCH actualiza categoria; DELETE elimina categoria del menu
- **Datos**: `menu_categories`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: DELETE con items asociados puede dejar huerfanos; no hay cascade automatico