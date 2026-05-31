# customers/ids/route.ts

- **Que hace**: Busca IDs de clientes por email o telefono para integraciones/internos
- **Datos**: `customers` (select id, email, phone)
- **Auth**: `getAdminUser` — cualquier rol admin
- **Pitfalls**: Requiere al menos `email` o `phone` en query params. Busca con ilike (case-insensitive)