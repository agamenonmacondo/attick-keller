# Auditoría V2 — Attick & Keller

## Score: 4.5/10

Mejora leve respecto a V1 (3.5/10): los helpers de auth (`requireAdmin/requireStaff/requireSuperAdmin`), `canCreateRole`, rate-limit en `/api/auth`, allowlist en `pos-upload` y `timingSafeEqual` en `nomina-import` son reales y correctos. **Pero varias "correcciones" reportadas por Hermes NO existen en el código** — 4 rutas admin siguen sin auth.

---

## Arreglado desde V1 (confirmado ✅)

| # | Hallazgo V1 | Estado |
|---|---|---|
| C3 | `/api/auth` sin rate-limit ni validación | ✅ `rateLimit` + `validateEmail` existen en `api-security.ts`. NOTA: el rate-limit es in-memory por instancia → ineficaz en Vercel serverless multi-instancia (ver Estructural). |
| C5 | `canCreateRole()` sin jerarquía | ✅ Implementa jerarquía `super_admin > store_admin` con listas separadas (`SUPER_CREATABLE_ROLES` vs `ADMIN_CREATABLE_ROLES`). |
| C6 | `nomina-import` compara strings sin timing-safe | ✅ Usa `timingSafeEqual`. |
| C7 | `pos-upload` sin allowlist de columnas | ✅ `filterRowColumns` + `POS_UPLOAD_COLUMN_ALLOWLIST` correctos, fuerza `restaurant_id`. |
| Estructural | Helpers de auth centralizados | ✅ `api-security.ts` con `requireAdmin/requireStaff/requireStaffOrLeader/requireSuperAdmin` + `isAuthError`. |

---

## Sigue vulnerable ❌ (Hermes dijo "arreglado" pero NO lo está)

### CRITICAL-1 — 4 rutas `/api/admin/*` 100% sin autenticación
Hermes afirmó que `reservation-logs`, `reservation-notes`, `table-blocks` y `margins` ya tenían `requireStaff()`/`requireAdmin()`. **FALSO.** Las 4 usan la `SUPABASE_SERVICE_ROLE_KEY` directamente vía `fetch()` al REST de Supabase **sin ninguna verificación de auth**:

| Ruta | Qué expone | Impacto |
|---|---|---|
| `/api/admin/informes-rayo/margins` | Revenue, costos, márgenes brutos por producto (financiero) | **CRITICAL** — cualquiera en internet lee datos financieros |
| `/api/admin/reservation-notes` (GET/POST/DELETE) | Notas internas de reservas; permite CREAR y BORRAR | **CRITICAL** — escritura/borrado anónimo, falsificación de auditoría |
| `/api/admin/table-blocks` (GET/POST/DELETE) | Bloqueos de mesas; permite crear/eliminar | **HIGH** — sabotaje operativo (bloquear/desbloquear mesas) |
| `/api/admin/reservation-logs` (GET) | Trail de auditoría completo | **HIGH** — filtración de logs internos |

PoC: `curl https://ak-dashboard.vercel.app/api/admin/informes-rayo/margins?from=2026-01-01&to=2026-12-31` → 200 con datos.

### CRITICAL-2 — `middleware.ts` NO protege `/api/*`
El matcher incluye todos los paths, pero la lógica del middleware **solo** redirige/gatea `/admin`, `/host`, `/perfil`, `/reservar`, `/mi-turno`. Las rutas `/api/*` **no** son evaluadas por el middleware — toda la seguridad de API depende de que cada handler llame manualmente a `getStaffUser`/`requireAdmin`/etc. **Cualquier ruta que lo olvide queda pública** (este es exactamente el mecanismo de CRITICAL-1). No hay red de seguridad.

### HIGH-1 — `next.config.ts`: `ignoreBuildErrors: true` sigue ACTIVO (línea 4)
```ts
typescript: { ignoreBuildErrors: true },
```
Errores de TypeScript y (si se añade) de ESLint se silencian en build de producción. El sistema de tipos como red de seguridad queda inutilizado — bugs de tipos que podrían ser de seguridad pasan a prod sin avisar. Hermes no lo tocó.

### HIGH-2 — `/api/admin/debug` NO usa `requireSuperAdmin` (Hermes equivocado otra vez)
Hermes afirmó C4 "debug ya tiene requireSuperAdmin() primero". **FALSO.** El handler (`debug/route.ts`):
1. Comprueba `ALLOW_DEBUG !== 'true'` → 404 (gate por env-var, correcto).
2. Luego `getAdminUser()` — que admite **`store_admin` O `super_admin`**, NO solo super_admin.

Cualquier `store_admin` accede al debug cuando `ALLOW_DEBUG=true`. Además el paso 6 devuelve `full_name, phone, email` de customers (PII) en la respuesta. Usar `requireSuperAdmin` en lugar de `getAdminUser`.

### MEDIUM — IDOR de scoping en `/api/admin/reservations/[id]/route.ts` (PATCH)
Línea 28-32 y 240: `.eq('id', id)` **sin** `.eq('restaurant_id', RESTAURANT_ID)`. Al ser single-tenant (`RESTAURANT_ID` hardcoded) no hay fuga cross-tenant real, pero falta la defensa en profundidad: el fetch/update de la reserva no acota por restaurante. La ruta pública `/api/reservations/[id]/route.ts` SÍ verifica propiedad (`customer.auth_user_id === user.id` o admin) — esa está bien.

### MEDIUM — `maskPII` es código muerto (definido, jamás usado)
`maskPII()` existe en `api-security.ts` (y tiene tests) pero **0 rutas lo importan/usan**. La intención declarada (enmascarar email/phone para roles `host`/`lider_area`) no se aplica en ningún endpoint:
- `/api/admin/customers` y `/api/admin/customers/[id]` devuelven `phone` + `email` en claro. Mitigación parcial: usan `getAdminUser` (solo store_admin/super_admin), así que el acceso es admin-only y es aceptable hoy.
- `/api/admin/staff` devuelve emails de **todos** los usuarios vía `auth.admin.listUsers()` (admin-only, OK).
- Rutas `shift-checkin/checkout/novedades` accesibles a empleados: revisar si exponen email/phone de pares sin mascara (la función `maskPII` se creó precisamente para esto y no se aplica).

### STRUCTURAL
- **Rate limiter in-memory** (`rateLimitStore = new Map`): no sobrevive entre instancias serverless ni entre cold starts. En Vercel es cosmético — un atacante reparte requests entre instancias y lo bypasa. Requiere Redis/Upstash o middleware edge con KV.
- **`getServiceClient()` crea un cliente nuevo por llamada** (`createClient` sin singleton) — no es de seguridad pero genera latencia y conexiones desperdiciadas en cada request.
- **`/api/auth/route.ts` POST**: `listUsers()` itera TODOS los usuarios del proyecto Supabase para encontrar uno por email — O(N) y filtra que el email existe siempre (responde `{success:true}` sin importar el caso). El comportamiento "no revelar si existe" está OK, pero la implementación no escala.
- **Service role key en handlers via `fetch()` crudo** (reservation-logs/notes/table-blocks): patrón inseguro — elude RLS y los helpers centralizados. Migrar a `getServiceClient()` + auth helper.

---

## Nuevos hallazgos (no en V1)

1. **`getStaffUser` admite `host`** → un `host` puede PATCHear cualquier reserva vía `/api/admin/reservations/[id]` (cambiar status, mesa). Esto parece intencional por diseño (host = anfitrión), pero el handler no restringe qué campos modifica el host a pesar del bloque `if (isHost)` — el host solo puede cambiar `status` y `table_id` (línea 102-107), lo cual está bien. Confirmar que el front no envíe otros campos que se ignoran correctamente (sí, se ignoran). **OK, no es bug.**
2. **`getClientIP` confía en `x-forwarded-for` sin validación** — spoofable, pero solo se usa como clave de rate-limit (que ya es débil). Bajo impacto.
3. **`validateUUID` no se aplica** en `/api/admin/reservations/[id]` (el `id` del path va directo a la query). Inyección en query de Supabase es de bajo riesgo (PostgREST parametriza), pero conviene validar.

---

## Recomendaciones (priorizadas)

1. **CRITICAL**: Añadir `requireStaff()`/`requireAdmin()` a las 4 rutas huérfanas (`margins`, `reservation-logs`, `reservation-notes`, `table-blocks`). Reescribirlas con `getServiceClient()` en vez de `fetch()`+service-key crudo.
2. **CRITICAL**: Extender el `middleware.ts` para gatear `/api/admin/*` (y `/api/host/*` si existe) con `hasAnyRole`, como red de seguridad frente a handlers que olviden el helper.
3. **HIGH**: Quitar `typescript: { ignoreBuildErrors: true }` de `next.config.ts`; corregir los errores de tipo que emerjan.
4. **HIGH**: `/api/admin/debug` → reemplazar `getAdminUser` por `requireSuperAdmin`; además enmascarar/quitar la salida PII del paso 6.
5. **MEDIUM**: Añadir `.eq('restaurant_id', RESTAURANT_ID)` a los fetch/update de `/api/admin/reservations/[id]`.
6. **MEDIUM**: Aplicar `maskPII` (o eliminarlo) — decidir la política de PII para host/lider_area y aplicarla consistentemente en customers, staff y shift-*.
7. **STRUCTURAL**: Migrar rate-limit a Upstash/Redis edge; cachear el service client.