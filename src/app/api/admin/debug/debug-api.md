# debug/route.ts

- **Que hace**: Endpoint de diagnostico: verifica conexiones a Supabase, auth, y tablas
- **Datos**: Health check a multiples tablas (`customers`, `reservations`, `tables`, `user_roles`)
- **Auth**: `getAdminUser` — solo super_admin
- **Pitfalls**: NO usar en produccion por seguridad. Expone info interna del servidor