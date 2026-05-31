# middleware.ts

## Proposito

Middleware de Next.js que protege rutas por rol. Se ejecuta en cada request que coincide con el matcher (todas las rutas excepto static assets e imagenes).

Rutas protegidas:
- `/admin/*` — Solo `store_admin` y `super_admin`
- `/host/*` — `store_admin`, `super_admin` y `host`
- `/perfil/*`, `/reservar/*` — Cualquier usuario autenticado
- `/mi-turno/*` — `lider_area`, `colaborador`, `reservante`, `store_admin`, `super_admin`

Redirecciones:
- No autenticado → `/auth/login`
- Autenticado sin permiso para `/admin` → `/host`
- Autenticado sin permiso para `/host` → `/perfil`
- Autenticado sin permiso para `/mi-turno` → `/perfil`

## Datos

### Tablas Supabase
- `user_roles` — Consulta para verificar rol del usuario autenticado
  - Filtra por `auth_user_id`, `restaurant_id`, `is_active=true`, y roles permitidos

### Flujo por ruta
1. Crear `createServerClient` con cookies del request
2. Obtener usuario via `supabase.auth.getUser()`
3. Si la ruta es protegida y no hay usuario → redirect a login
4. Si hay usuario, crear service client y consultar `user_roles`
5. Si el rol no esta en la lista permitida → redirect a ruta apropiada

## Dependencias

### Lo usa
- Next.js middleware system — Se ejecuta automaticamente en cada request

### Usa a
- `@supabase/ssr` — `createServerClient` para manejo de cookies
- `@supabase/supabase-js` — `createClient` para service role query
- `@/lib/utils/constants` — `RESTAURANT_ID`

## Pitfalls

- **Logica duplicada con admin-auth.ts**: El middleware replica la verificacion de roles que ya existe en `getAdminUser()`, `getHostUser()`, etc. Pero en vez de usar esas funciones, las reimplementa inline. Si se agrega un rol nuevo, hay que actualizar `admin-auth.ts` Y `middleware.ts`. Ver `admin-auth.md` para detalles.
- **4 llamadas Supabase en el peor caso**: Si un usuario autenticado sin ningun rol intenta acceder a `/admin`, el middleware hace: 1) auth.getUser, 2) user_roles query. Si falla, redirige a `/host`, lo que dispara otro ciclo: 1) auth.getUser, 2) user_roles query. Redirige a `/perfil`. Todo esto en una sola request del navegador que hace multiples redirects antes de llegar al destino.
- **Creamos service client en cada ruta protegida**: Se crea un nuevo `createClient()` con service role key para cada verificacion de rol. Esto es innecesario — podria usar el mismo client.
- **`.single()` estricto**: Igual que `admin-auth.ts`, usa `.single()`. Si un usuario tiene roles duplicados (ej: `store_admin` dos veces por error de datos), la query falla y el usuario se queda sin acceso a pesar de tener el rol correcto.
- **No hay cache**: Cada request que toca una ruta protegida pasa por 2+ queries a Supabase. Para alto trafico, considerar cache Redis o similar.
- **Matcher muy amplio**: El matcher excluye `_next/static`, `_next/image`, `favicon.ico` y archivos de imagen, pero INCLUYE `/api/*`. Esto significa que las API routes tambien pasan por el middleware, pero las API routes usan `getAdminUser()` internamente. Resulta en doble verificacion para cada llamada API.
- **Redireccion sin loop protection**: Si `/host` redirige a `/perfil` por no tener rol, y `/perfil` no redirige (solo requiere auth), el usuario ve `/perfil`. Pero si el middleware se modifica para proteger `/perfil` con roles, se podria crear un loop de redirecciones.
- **`RESTAURANT_ID` hardcoded**: Cada query filtra por `restaurant_id = RESTAURANT_ID`. Si se agregan multi-tenant, todo se rompe.
- **No maneja errores de conexion**: Si Supabase no responde, el middleware lanzara una excepcion no manejada y el usuario vera un error 500 sin mensaje claro.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: agregar rol reservante al enum, API, formulario y middleware |
| 2026-05-28 | Ninja | feat: panel colaborador — mi-turno con horario, checkin/out, novedad 24hrs, horas trabajadas |
| 2026-05-28 | Ninja | fix: Polish host dashboard UI and fix operational bugs |
| 2026-05-27 | Ninja | feat: rebuild: complete site rewrite — auth, menu, reservations, admin — build passing |