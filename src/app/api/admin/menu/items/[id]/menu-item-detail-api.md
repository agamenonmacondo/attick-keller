# menu/items/[id]/route.ts

- **Que hace**: PATCH actualiza item (nombre, precio, disponibilidad); DELETE elimina item
- **Datos**: `menu_items`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: PATCH usa `is_available` toggle para deshabilitar sin eliminar (soft approach)