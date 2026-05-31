# staff/[id]/route.ts

- **Que hace**: PATCH activa/desactiva un rol de staff; DELETE elimina asignacion de rol
- **Datos**: `user_roles`
- **Auth**: `getAdminUser` — roles super_admin, store_admin
- **Pitfalls**: No puedes desactivar ni eliminar tu propio rol (self-deactivation protection). Ambas operaciones usan restaurant_id scope