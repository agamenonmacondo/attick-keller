# admin-auth.ts

## Proposito

Modulo central de autenticacion para todas las API routes admin y middleware. Provee:
- `getServiceClient()` — Cliente Supabase con service role key (bypassea RLS)
- `getAdminUser(request)` — Verifica que el usuario autenticado sea `store_admin` o `super_admin`
- `getHostUser(request)` — Verifica que el usuario sea `host`
- `getEmployeeUser(request)` — Verifica que el usuario sea `lider_area`, `colaborador` o `reservante`; retorna `pos_nomina_staff_id`
- `getStaffUser(request)` — Verifica que el usuario sea `store_admin`, `super_admin` o `host`

Exporta `RESTAURANT_ID` desde constants, y `AdminUser`, `HostUser`, `EmployeeUser` como tipos.

## Datos

### Tablas Supabase
- `user_roles` — Consulta principal para verificar roles
  - Campos usados: `auth_user_id`, `role`, `restaurant_id`, `is_active`, `pos_nomina_staff_id`
- `auth.users` (via `supabase.auth.getUser()`) — Identidad del usuario autenticado

### Flujo de autenticacion
1. Crear `createServerClient` con cookies del request (anon key)
2. Llamar `supabase.auth.getUser()` para obtener el usuario autenticado por sesion cookie
3. Si no hay usuario, retornar `null`
4. Crear `getServiceClient()` (service role key) para consultar `user_roles`
5. Query a `user_roles` filtrando por `auth_user_id`, `restaurant_id`, `is_active=true`, y los roles permitidos
6. Si `.single()` retorna data, el usuario tiene permiso; si no, `null`

### Workaround
- **`setAll() {}` vacio**: El `createServerClient` en contexto de API route no necesita escribir cookies, solo leerlas. Por eso `setAll` es una funcion vacia. Si se necesita refresh de token, esto necesitara implementarse.

## Dependencias

### Lo usa (consumidores principales)
- **Todas las API routes admin** — `src/app/api/admin/*/route.ts` usan `getAdminUser` o `getHostUser`
- **middleware.ts** — Duplica la logica de verificacion de roles (ver Pitfalls)
- **Cualquier API route que necesite autenticacion** — Importa `getServiceClient`, `getAdminUser`, `getHostUser`, `getEmployeeUser`, o `getStaffUser`

### Usa a
- `@supabase/supabase-js` — `createClient` para service role
- `@supabase/ssr` — `createServerClient` para lectura de cookies
- `@/lib/utils/constants` — `RESTAURANT_ID`

## Pitfalls

- **Logica duplicada con middleware.ts**: `middleware.ts` tiene su propia logica de verificacion de roles que consulta `user_roles` directamente, replicando las mismas queries pero con codigo diferente. Si se agrega un rol nuevo, hay que actualizar `admin-auth.ts` Y `middleware.ts` en los arrays `.in('role', [...])`. Se agrego `reservante` al enum pero es facil olvidar sincronizar.
- **Arrays de roles hardcoded**: Los roles permitidos estan en arrays literales string: `['store_admin', 'super_admin']`, `['host']`, `['lider_area', 'colaborador', 'reservante']`, etc. Si se agrega un rol nuevo (ej: `gerente`), hay que actualizar manualmente cada funcion y el middleware.
- **`.single()` estricto**: Todas las queries usan `.single()`, lo que significa que si un usuario tiene mas de un rol activo para el mismo restaurante, la query falla con error PGRP (Supabase retorna mas de una fila). No hay manejo de este caso — deberia usar `.maybeSingle()` o limitar a 1.
- **Service role bypasea RLS**: `getServiceClient()` usa `SUPABASE_SERVICE_ROLE_KEY` que tiene acceso total a la BD. Es correcto para endpoints admin, pero cualquier泄漏 de esta key es critica de seguridad.
- **No hay cache de sesion**: Cada llamada a `getAdminUser` (y variantes) hace 2 queries: una para autenticar via cookies y otra para verificar el rol. No hay cache alguno. Si una pagina hace 5 llamadas API, se hacen 10 queries de autenticacion.
- **`EmployeeUser` requiere `pos_nomina_staff_id`**: `getEmployeeUser` retorna `null` si el usuario no tiene `pos_nomina_staff_id` en `user_roles`. Esto es intencional (empleados sin staff_id no pueden acceder al panel), pero el error no distingue entre "no tiene rol" y "no tiene staff_id".
- **Solo valida `is_active=true`**: Si un usuario es desactivado (`is_active=false`), se rechaza. Pero si se desactiva un rol especifico y el usuario tiene otro rol activo, solo se rechaza el rol desactivado. Esto es correcto pero podria causar confusion.

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: agregar rol reservante al enum, API, formulario y middleware |
| 2026-05-28 | Ninja | feat: panel colaborador — mi-turno con horario, checkin/out, novedad 24hrs, horas trabajadas |
| 2026-05-27 | Ninja | chore: stage remaining shift files and minor auth changes |