# AUDITORÍA TOTAL: Seguridad + Deuda Técnica — Attick & Keller

**Fecha:** 2026-06-17
**Alcance:** 87 API routes (`src/app/api/**/route.ts`), `src/middleware.ts`, `src/lib/utils/admin-auth.ts`, `next.config.ts`, `package.json`, dependencias, estructura de repo.
**Metodología:** Lectura completa de cada ruta + verificación de patrones transversales (`grep`/`find`). Cada hallazgo cita `archivo:línea`.

---

## 1. RESUMEN EJECUTIVO

**Score de seguridad: 3.5 / 10**

La aplicación tiene una infraestructura de autenticación razonable y centralizada (`src/lib/utils/admin-auth.ts` con helpers por rol, y la mayoría de rutas admin la usan correctamente). **Pero existen brechas críticas y explotables hoy mismo**, sin necesidad de multi-tenant:

### Hallazgos críticos (explotables en producción actual)
1. **3 rutas admin de mutación/lectura sin NINGÚN auth** — abiertas a Internet anónima:
   - `/api/admin/reservation-notes` (GET/POST/DELETE) — leer/inyectar/borrar notas internas de cualquier reserva + falsificar la autoría del audit log.
   - `/api/admin/reservation-logs` (GET) — filtrar la auditoría completa de cualquier reserva.
   - `/api/admin/table-blocks` (GET/POST/DELETE) — bloquear/liberar mesas de cualquier restaurante (DoS del algoritmo de asignación).
2. **`/api/admin/informes-rayo/margins` sin auth** — cualquiera obtiene márgenes brutos, costos y estructura de precios de todos los productos (info financiera sensible).
3. **`/api/auth` POST/PUT sin auth ni rate-limit** — autoconfirmación de cuentas ajenas (bypass del flujo de verificación de email de Supabase) + generación ilimitada de recovery links (spam/abuso de Resend).
4. **`/api/admin/debug`** — filtra metadata de env vars (presencia/ausencia de cada secret) **antes** del check de auth; con `ALLOW_DEBUG=true` expone PII de clientes y estructura de DB.
5. **Escalada de privilegios**: `store_admin` puede otorgar rol `super_admin` y crear cuentas de auth nuevas (`/api/admin/staff` POST).
6. **Escritura masiva de nómina sin validación**: `/api/admin/nomina-import` acepta arrays crudos → insert directo de salarios, deducciones y provisiones para cualquier empleado/periodo, sin `restaurant_id` ni Zod. Vector de fraude de nómina.
7. **`/api/admin/pos-upload`** — upsert crudo de 8 tablas POS sin allowlist de columnas, sin validación, sin `restaurant_id` server-side. Permite alterar ventas, impuestos, propinas, pagos y staff.

### Deuda técnica estructural grave
- **Codebase duplicado**: existe una copia completa en `/mnt/f/attick-keller/` (git root propio, 87 rutas) y otra en `/mnt/f/attick-keller/web/` (repo git anidado, 87 rutas), más `web/web/` vacío y `_web_archived/`. Riesgo alto de drift y de desplegar la copia equivocada.
- **`typescript.ignoreBuildErrors = true`** oculta todos los errores de tipo en build.
- **0 rutas usan Zod** (a pesar de ser dependencia declarada). Toda validación es ad-hoc.
- **90 archivos usan service_role** (bypassea RLS); la tenancy descansa 100% en filtros `.eq('restaurant_id', RESTAURANT_ID)` que faltan en muchos lookups por `id`.
- **`console.error`/`error.message` al cliente en ~40 puntos** — fuga de schema/constraints Postgres.
- **42 `as any`/`as unknown as`** en rutas — type-safety desactivada en el camino de datos sensibles (nómina, costos).

### Lo que está bien
- Helpers de auth centralizados y correctos por rol. La mayoría de rutas admin sí los llaman y devuelven 403.
- El middleware protege páginas correctamente por rol (`store_admin`/`super_admin`/`host`/`lider_area`).
- No hay secrets en `NEXT_PUBLIC_*` (anon keys es lo esperado); `GROQ_API_KEY` y `RODRI_SUPABASE_SERVICE_ROLE_KEY` son server-side.
- Headers de seguridad en `next.config.ts` (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy).
- `/api/auth/role` **no** confía en claims del cliente — lee roles de la DB desde la sesión. ✓
- Los prompts de IA (Groq) **no** envían PII de clientes (sí nombres de staff y datos financieros).
- Validación de input decente en `/api/availability` (regex de fecha + rango de `party_size`) — el modelo a seguir.

---

## 2. HALLAZGOS CRÍTICOS

### C1 — Rutas admin sin autenticación (mutación anónima)
**Severidad:** CRÍTICO
**Archivos:**
- `src/app/api/admin/reservation-notes/route.ts:19-157` (GET/POST/DELETE)
- `src/app/api/admin/reservation-logs/route.ts:10-37` (GET)
- `src/app/api/admin/table-blocks/route.ts:19-215` (GET/POST/DELETE)

**Descripción:** Ningún método llama a `getStaffUser`/`getAdminUser`. El middleware **no protege rutas `/api`** (solo páginas), así que son accesibles por cualquier anónimo en Internet. Las tres usan `SUPABASE_SERVICE_ROLE_KEY` en `fetch` crudo contra PostgREST (bypassea RLS). Sin filtro `restaurant_id` en las operaciones por `id`.

**Riesgo:**
- `reservation-notes`: cualquier anónimo puede leer notas internas de cualquier reserva, inyectar notas atribuidas a cualquier `author_name`/`author_id` (falsificación de audit log), y borrar notas por `id`.
- `reservation-logs`: filtrar la auditoría completa (transiciones de estado, quién las hizo, valores de campos) de cualquier reserva + enumerar IDs válidos.
- `table-blocks`: bloquear todas las mesas para cualquier fecha (rompiendo todas las reservas futuras — DoS del algoritmo) o liberar bloques. DELETE sin ownership check → borrado cross-tenant.

**Fix recomendado:**
```ts
const staff = await getStaffUser(request)
if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
```
en cada método. Derivar `performed_by_name` de `staff.email` (no del body). Filtrar por `reservations.restaurant_id = RESTAURANT_ID` (lookup en dos pasos o nested filter). `encodeURIComponent` todos los IDs interpolados en URLs. Eliminar el `fetch` crudo → usar el SDK.

### C2 — `/api/admin/informes-rayo/margins` sin auth
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/admin/informes-rayo/margins/route.ts:4`

**Descripción:** Ningún check de auth. Crea un cliente con `SUPABASE_SERVICE_ROLE_KEY` y ejecuta el RPC `get_product_margins` con fechas de query params. Devuelve márgenes brutos, costos totales, revenue e inventario completo. Las rutas hermanas (`informes-rayo/route.ts:5`, `productos-hora/route.ts:5`, `analyze/route.ts:6`) **sí** llaman `getAdminUser` — aquí se omitió.

**Riesgo:** Cualquiera (no autenticado, host, cliente) lee la estructura de costos y márgenes financieros del restaurante.

**Fix:** Añadir `getAdminUser` al inicio (como sus rutas hermanas) y retornar 403 si null. Usar `getServiceClient()` en vez de `createClient` inline.

### C3 — `/api/auth` POST/PUT sin auth ni rate-limit
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/auth/route.ts:5` (POST), `:55` (PUT)

**Descripción:**
- **POST (signup/auto-confirm):** sin auth. Recibe `email`/`name` sin Zod. Usa `sb.auth.admin.listUsers()` para enumerar usuarios, busca por email y, si existe, **auto-confirma el email** (`email_confirm: true`) y crea un row `customers`. Envía email de bienvenida (costo Resend). El `customers` creado usa `phone: pending_${existingUser.id}` → **filtra el UUID del usuario**.
- **PUT (password reset):** sin auth. `sb.auth.admin.generateLink({ type: 'recovery', email })` para cualquier email, sin límite, y envía el link por email.

**Riesgo:**
- Enumeración de usuarios (timing/respuestas).
- **Bypass de verificación de email**: un atacante que conoce un email pendiente fuerza su confirmación sin acceso al inbox.
- Spam/DoS de la cola de email (generación infinita de recovery links / welcome emails).
- Posible inyección de header/contenido en los emails si `name` no se sanitiza.

**Fix:** Exigir sesión válida del propio usuario antes de auto-confirmar (verificar `auth_user_id === caller`). Rate-limitar por IP/email (p. ej. 3/hora). Validar email con Zod. Usar el flujo nativo `auth.resetPasswordEmail` (anon) en vez de `admin.generateLink` (service role). Considerar CAPTCHA.

### C4 — `/api/admin/debug` filtra metadata de env antes del auth + PII con ALLOW_DEBUG
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/admin/debug/route.ts:4` (handler), `:12-23` (pre-auth), `:38/59/77/95/114/138` (`String(err)`)

**Descripción:** El check `getAdminUser` ocurre **después** de construir `steps` con `URL: true, ANON_KEY: true, SERVICE_KEY: true` y, si faltan vars, devolver `{ steps, error }` (líneas 22-23) **antes de cualquier auth** — filtra presencia/ausencia de cada secret. Con `ALLOW_DEBUG=true`, expone `restaurantId`, samples y conteos de `customers` (con `id`), `customer_stats` (`total_visits`, `total_spent`, `last_visit_date`, `loyalty_tier`, `is_recurring` — PII), `customer_tag_links`, y un customer individual con `total_spent`. Los `catch` serializan `String(err)` (puede incluir stack/PostgREST `details`/`hint`).

**Riesgo:** Exposición de PII de clientes (gasto total, tier de lealtad), estructura de DB, y diagnóstico de config a quien obtenga credenciales admin o si `ALLOW_DEBUG` queda activo. La rama pre-auth filtra estado de secrets sin auth alguno.

**Fix:** Mover `getAdminUser` a la **primera línea** del handler. Eliminar `ALLOW_DEBUG` o cambiarlo a check de `super_admin` + IP allowlist. No serializar `String(err)`/`error.message`. No devolver samples de filas. Este endpoint no debería existir en producción.

### C5 — Escalada de privilegios: `store_admin` crea `super_admin` y cuentas de auth
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/admin/staff/route.ts:40-123` (POST), `:22` (GET)

**Descripción:** POST usa `getAdminUser` (que admite `store_admin` **y** `super_admin`). El allowlist de roles (línea 52) incluye `super_admin`. No hay check de jerarquía: un `store_admin` puede asignar `super_admin` a cualquier email, y **auto-crea un usuario de auth** (`sb.auth.admin.createUser`, `email_confirm: true`, sin password) si el email no existe (líneas 67-74). GET llama `sb.auth.admin.listUsers()` y devuelve el listado completo de emails + `auth_user_id` a cualquier `store_admin`.

**Riesgo:** Escalada total: `store_admin` → `super_admin` + mint de cuentas de auth que bypassean verificación de email. El GET filtra todos los emails del proyecto y `auth_user_id` (vector de impersonación). Fuga `createError?.message` al cliente (línea 72).

**Fix:** Solo `super_admin` puede otorgar `store_admin`/`super_admin` y crear cuentas. Añadir check de jerarquía (`caller.role >= target.role`). No devolver `auth_user_id`. Usar `admin.getUserByEmail` en vez de `listUsers()`. Restringir el listado de usuarios a `super_admin`.

### C6 — `/api/admin/nomina-import`: escritura masiva de nómina sin validación
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/admin/nomina-import/route.ts:9-151` (POST)

**Descripción:** Auth = token `===` IMPORT_TOKEN **OR** `getAdminUser` (admite `store_admin`). El `data` de cada tabla (`insert_detalle`, `insert_he_recargos`, `insert_novedades`, `insert_provisiones`, `insert_propinas`) se pasa directo a `.insert(data)` — columnas arbitrarias (`salario`, `neto_a_pagar`, `provisiones_*`) sin Zod ni `restaurant_id`. `upsert_staff` (líneas 32-88) escribe `salario`, `auxilio_no_salarial`, `cargo`, `modalidad`, `sede`, `fecha_ingreso` desde `emp.*` lookup por `cedula` — un caller puede sobreescribir el salario de cualquier empleado por cédula. `update_periodo` hace `{ id, ...updates }` sin allowlist. El token se compara con `===` (timing-unsafe). El catch devuelve `String(err)` al cliente (línea 151).

**Riesgo:** Fraude de nómina: cualquier `store_admin` (o quien tenga el token sin rotación/expiry) puede escribir salarios, deducciones y provisiones arbitrarias para cualquier empleado/periodo, sin tenancy. Sobrescritura de salario por cédula.

**Fix:** Restringir a `super_admin`. Comparar token con `crypto.timingSafeEqual`. Zod por tabla + allowlist de columnas. Scope por `restaurant_id`. Nunca insertar `data` crudo. Loggear todo cambio de salario.

### C7 — `/api/admin/pos-upload`: upsert crudo multi-tabla sin allowlist
**Severidad:** CRÍTICO
**Archivo:** `src/app/api/admin/pos-upload/route.ts:31-52` (POST)

**Descripción:** Acepta JSON arbitrario; itera 8 tablas (`pos_sales`, `pos_sale_items`, `pos_products`, `pos_product_groups`, `pos_staff`, `pos_areas`, `pos_sale_payments`, `pos_payment_methods`) y hace `.upsert(body[key], { onConflict })` sin allowlist de columnas, sin Zod, sin forzar `restaurant_id`. El nombre "upload" sugiere import curado; en realidad es bulk write sin esquema. *(No es file-upload real — es JSON.)*

**Riesgo:** Un admin puede sobreescribir/insertar filas con columnas controladas por el caller: `restaurant_id`, `is_paid`, `is_cancelled`, `tax1`, `tip_amount`, `total`, identidad de staff, registros de pago → manipulación financiera, impersonación de staff, escritura cross-tenant si las tablas tienen `restaurant_id`.

**Fix:** Schemas Zod por tabla con allowlist + `restaurant_id = RESTAURANT_ID` server-side. Rechazar keys desconocidas. Validar tipos (`total` numérico, `is_cancelled` boolean). Limitar tamaño/tasa.

---

## 3. HALLAZGOS ALTOS

### A1 — IDOR: lookups por `id` sin `restaurant_id` (patrón sistémico)
**Severidad:** ALTO
**Archivos:**
- `src/app/api/reservations/route.ts:312-318` (PUT), `:441-447` (PATCH)
- `src/app/api/reservations/[id]/route.ts:24` (GET)
- `src/app/api/admin/reservations/[id]/route.ts:28` (fetch) + `:240` (update)
- `src/app/api/admin/reservations/[id]/table-options/route.ts:32-38` (GET)
- `src/app/api/admin/table-suggestion/route.ts:93` (POST fetch)
- `src/app/api/admin/menu/[id]/recipe/route.ts:16-21` (GET — lee costos/márgenes de cualquier menú)
- `src/app/api/admin/pos-products/[id]/route.ts:17-24` (GET — lee costos/recipe de cualquier producto)
- `src/app/api/admin/nomina/[id]/he-recargos|novedades|propinas|provisiones/route.ts:8-22` (GET — lee nómina de cualquier periodo)
- `src/app/api/admin/customers/[id]/tags/route.ts:28-78` (POST/GET/DELETE — tag links sin ownership del customer)
- `src/app/api/admin/reservation-notes/route.ts` (todas, además del no-auth)
- `src/app/api/admin/table-blocks/route.ts:149-158` (DELETE)

**Descripción:** Patrón `.eq('id', id).single()` sin `.eq('restaurant_id', RESTAURANT_ID)`. Como `getServiceClient()` bypassa RLS, el filtro `restaurant_id` es la **única** guarda de tenancy; sin él, cualquier admin/staff puede leer o mutar filas de otro restaurante cambiando `id`. La ruta que lo hace bien (template a seguir): `src/app/api/admin/reservations/[id]/internal-notes/route.ts:30,39`.

**Riesgo:** Hoy la app es single-tenant (un `RESTAURANT_ID` hardcoded), así que esto es **latente** salvo en `menu/[id]/recipe`, `pos-products/[id]`, `nomina/[id]/*` y `customers/[id]/tags`, donde la falta de scope permite leer datos financieros/HR de cualquier fila por enumeración de `id` (incluso dentro del único tenant, expone costos a cualquier `store_admin`). Si se añade un segundo restaurante, todas estas rutas filtran.

**Fix:** Todo fetch/update/delete por `id` debe incluir `.eq('restaurant_id', RESTAURANT_ID)` y devolver 404 si no matchea. Para tablas hijas sin `restaurant_id` (`pos_sale_items`, `nomina_detalle`), scopear vía los IDs padre ya verificados.

### A2 — `store_admin` puede mutar salarios/PII de cualquier empleado + deadmin a `super_admin`
**Severidad:** ALTO
**Archivos:**
- `src/app/api/admin/nomina-staff/route.ts:15/47` (GET devuelve `salario`+`cedula` a `store_admin`), `:63-142` (POST/PATCH escriben `salario` sin scope; PATCH toma `id` del body — IDOR)
- `src/app/api/admin/staff/[id]/route.ts:12-73` (PATCH/DELETE: `store_admin` puede desactivar/borrar el rol de un `super_admin` — sin check de jerarquía; self-deactivation/self-delete sí bloqueado ✓)

**Descripción:** `nomina-staff` permite a `store_admin` leer y escribir `salario`, `cedula`, `correo` de cualquier empleado por `id` del body, sin `restaurant_id`. `staff/[id]` permite a `store_admin` quitarle el acceso a un `super_admin`.

**Riesgo:** Escalada/abuso de privilegios sobre nómina y sobre admins superiores. Modificación de salario cross-empleado sin scope.

**Fix:** Writes de `salario` restringidos a `super_admin` (o rol de nómina). Scope por `restaurant_id`. Check de jerarquía antes de desactivar/borrar roles `store_admin`/`super_admin`.

### A3 — IDOR de admin sobre empleados en rutas shift
**Severidad:** ALTO
**Archivos:**
- `src/app/api/admin/shift-my-hours/route.ts:26-40` — admin lee horas de cualquier empleado vía `?employee_id=`
- `src/app/api/admin/shift-my-week/route.ts:29-49` — admin lee `salario` + schedule de cualquier empleado vía `?employee_id=`
- `src/app/api/admin/shift-novedades/route.ts:42-66` — admin inserta novedades (falta/incapacidad/permiso) para cualquier `employee_id` del body + muta sus assignments
- `src/app/api/admin/shift-assignments/route.ts:11-185` — `lider_area` reemplaza TODAS las asignaciones de cualquier `schedule_id` (sin verificar que `schedule.area` coincida con el área del líder; el TODO está documentado en `shift-schedules/route.ts:186-189`)
- `src/app/api/admin/shift-schedules/[id]/publish/route.ts:18-29` — `lider_area` publica cualquier schedule por `id` (sin scope de restaurante/área)

**Descripción:** Las ramas de **empleado** están bien scoped (`getEmployeeUser` usa `pos_nomina_staff_id` de la sesión, no del body; checkin/checkout verifican `assignment.employee_id === employeeId` ✓). Las ramas de **admin/líder** aceptan `employee_id`/`schedule_id` sin verificar autorización sobre ese recurso.

**Riesgo:** `store_admin`/`lider_area` pueden leer salarios y historial de asistencia de cualquier empleado, y mutar asignaciones/novedades de cualquier schedule (incl. fuera de su área para `lider_area`).

**Fix:** Para `lider_area`, verificar `schedule.area`/`employee.area` contra el área del caller (desde `user_roles`). Para `store_admin`, scope por `restaurant_id`. Quitar `salario` de selects no estrictamente necesarios.

### A4 — Fuga de `error.message`/stack al cliente (~40 puntos)
**Severidad:** ALTO (agregado)
**Archivos representativos:**
- `src/app/api/reservations/route.ts:198,296,424,476,560,580,601` (incl. insert error de customer)
- `src/app/api/admin/customers/route.ts:241` (DB error.message) + `:316-320` (**stack trace en el body** vía `details`)
- `src/app/api/admin/customers/segment-counts/route.ts:22-24,76-80`
- `src/app/api/admin/nomina/route.ts:61,80,143,281`
- `src/app/api/admin/nomina/ops-costs/route.ts:248-249`
- `src/app/api/admin/shift-assignments/route.ts:128-129`; `shift-schedules/route.ts:36-37,104`; `shift-schedules/[id]/publish/route.ts:55-56`
- `src/app/api/admin/pos-calendar/route.ts:62`; `pos-dashboard/route.ts:692`; `pos-ingredient-categories/route.ts:18`; `pos-ingredients/route.ts:46`; `pos-products/route.ts:25-26`
- `src/app/api/admin/informes-rayo/productos-hora/route.ts:36` (devuelve `err.message`)
- `src/app/api/admin/rodri/route.ts:53` (mensaje de error del esquema externo Seadotec)
- `src/app/api/admin/floorplan/route.ts:210` (207 con `details` = errores Supabase)
- `src/app/api/admin/inventory/combinations/route.ts:42,106`; `inventory/zones/route.ts:109`
- `src/app/api/zones/route.ts:17`; `src/app/api/menu/route.ts:26,29`
- `src/app/api/admin/reservation-logs/route.ts:33`; `reservation-notes/route.ts:41,80,142`; `table-blocks/route.ts:37,121,189` (devuelven `response.text()` crudo)

**Descripción:** `return NextResponse.json({ error: error.message })` o devolver el `response.text()` de Supabase al cliente. El peor caso es `customers/route.ts:316-320` que incluye el **stack trace** en el body. `nomina-import/route.ts:151` devuelve `String(err)`.

**Riesgo:** Fuga de nombres de tablas/columnas, constraints, códigos PG y, en el caso del stack, rutas de archivos y versiones de librerías → reconocimiento para un atacante.

**Fix:** Nunca devolver `error.message`/`stack`/`response.text()` al cliente. Retornar `{ error: 'Error interno del servidor' }` con 500; loggear el detalle server-side con un correlation ID. Modelo a seguir: `api/admin/reservations/route.ts:190`, `api/admin/zones/route.ts:15`, `api/admin/dates-with-reservations/route.ts`.

### A5 — service_role para writes en nombre de usuarios (sin ownership en DB)
**Severidad:** ALTO
**Archivos:** `src/app/api/reservations/route.ts:69-603` (POST/PUT/PATCH/GET — define su propio `getServiceClient` local en `:8-13` en vez de importar el de `admin-auth.ts`), y de forma sistémica todas las rutas (90 archivos).

**Descripción:** Toda operación (incluso writes en nombre del usuario autenticado) usa `getServiceClient()` (service_role, bypassa RLS). La ownership se enforcea solo en JS (`isOwner = customer?.id === reservation.customer_id`), no en la DB.

**Riesgo:** Un solo bug lógico en el check de ownership en JS permite leer/escribir filas arbitrarias (RLS bypassed).

**Fix:** Para operaciones user-scoped, usar un cliente anon/RLS para que la DB enforce ownership; reservar `service_role` para operaciones del sistema (lookup de customer upsert, audit log). Usar el `getServiceClient` compartido de `admin-auth.ts`.

### A6 — `body_html` sin sanitizar en templates de email (HTML injection)
**Severidad:** ALTO
**Archivo:** `src/app/api/admin/templates/route.ts:19` (POST)

**Descripción:** `body_html` se inserta tal cual (HTML para templates de email) sin sanitizar y sin Zod. `await request.json()` fuera de try/catch → 500 no manejado en JSON inválido.

**Riesgo:** Inyección de HTML/scripts en el pipeline de email (XSS persistente en correos). `dompurify` ya es dependencia — úsarlo server-side.

**Fix:** Zod (`body_html: z.string().min(1)`) + sanitizar con DOMPurify server-side antes de insertar. Envolver `request.json()` en try/catch.

### A7 — Service role de un Supabase externo (Seadotec) con `select('*')` sin paginar
**Severidad:** ALTO
**Archivo:** `src/app/api/admin/rodri/route.ts:6,50,53`

**Descripción:** `getRodriServiceClient()` usa `RODRI_SUPABASE_SERVICE_ROLE_KEY` (server-side ✓, no `NEXT_PUBLIC`) sobre la DB de un tercero (Seadotec). El GET hace `select('*')` sobre `employees`, `teams`, `ventas`, etc. sin paginar ni filtrar tenant, y devuelve todo. `order('nombre')` se aplica a todas las tablas (algunas sin esa columna → error filtrado al cliente línea 51).

**Riesgo:** Descarga completa de nómina/ventas/parámetros operativos de la empresa tercera en una llamada. Escalada lateral: si A&K se compromete, el atacante obtiene service role sobre Seadotec.

**Fix:** Key de solo lectura limitada a tablas necesarias (no service role completa). Paginar (`range()`). Select explícito de columnas. Mapear columna de orden por tabla. Si Seadotec es multi-tenant, filtrar.

### A8 — Filtro `or()` roto en `customers/ids` (bug funcional de seguridad)
**Severidad:** ALTO
**Archivo:** `src/app/api/admin/customers/ids/route.ts:32`

**Descripción:** `.or('email.is.null,email.eq.')` — falta el operando string vacío. Debería ser `email.eq.""` (patrón correcto en `customers/route.ts:133`). El filtro "sin email" queda malformado → devuelve el set equivocado de clientes.

**Riesgo:** Una campaña construida sobre esos IDs puede incluir clientes **con** email → contacto no deseado a segmento incorrecto.

**Fix:** `.or('email.is.null,email.eq.""')`.

### A9 — PII de clientes (email/teléfono) expuesta al rol `host`
**Severidad:** ALTO (agregado)
**Archivos:** `src/app/api/admin/occupancy/route.ts:96-97,151-157`; `src/app/api/admin/floorplan/route.ts:4-7,109-113`; `src/app/api/admin/dashboard/route.ts:37,87`

**Descripción:** Estas rutas usan `getStaffUser` (admite `host`) y devuelven `customer_phone`, `customer_email`, `customer_name`, `special_requests`, `internal_notes` por mesa.

**Riesgo:** Un `host` puede cosechar emails/teléfonos de todos los comensales del día (least-privilege violado).

**Fix:** Enmascarar email/teléfono para `host` (p. ej. últimos 4 del teléfono, omitir email) salvo que el caller sea admin; o justificar necesidad de negocio.

---

## 4. HALLAZGOS MEDIOS

### M1 — Cero validación Zod en las 87 rutas
**Severidad:** MEDIO (sistémico)
**Archivos:** todas las POST/PUT/PATCH. `grep` confirma **0** usos de `zod`/`safeParse` en `src/app/api`. Validación ad-hoc (`|| ''`, `parseInt` sin `isNaN`, truthiness checks).

**Riesgo:** JSON malformado → 500 no manejado (varias rutas con `request.json()` fuera de try/catch: `menu/categories`, `menu/items`, `customers/route.ts:10`, `segments/route.ts:23`, `tags/route.ts:30`, `tags/[id]/route.ts:12`, `campaigns/route.ts:11`). Campos sin tope de longitud. `party_size` sin rango. JSON arbitrario en jsonb (`preferences`, `filters`). Numéricos negativos/`NaN` en capacidad/precio/cantidad → corrompen el algoritmo de asignación y reportes.

**Fix:** Crear `src/lib/schemas/` con schemas Zod por endpoint. Aplicar `.safeParse` antes de tocar la DB. Modelo: `api/availability/route.ts:66-86` (regex fecha + rango `party_size` 1-20).

### M2 — `weeks` ilimitado → DoS autenticado
**Severidad:** MEDIO
**Archivo:** `src/app/api/admin/customers/analytics/trends/route.ts:10,31-95`

**Descripción:** `parseInt(searchParams.get('weeks') || '8')` sin tope. `weeks=100000` dispara ~300k queries secuenciales (3 por semana). Código muerto: `recurringThisWeek` (línea 79) nunca se usa; `retentionPct` (línea 82) mal etiquetado.

**Fix:** `Math.min(Math.max(weeks,1),52)` o Zod `z.coerce.number().int().min(1).max(52)`. Reescribir como un solo query agregado por semana.

### M3 — Auditoría falsificable (atribución desde el body)
**Severidad:** MEDIO
**Archivos:** `src/app/api/admin/reservation-notes/route.ts:49-58,147-154` (POST/DELETE); `src/app/api/admin/reservations/[id]/internal-notes/route.ts:19-20,54` (PATCH `author_name` del body sobreescribe `staff.email`)

**Descripción:** `author_name`/`author_id` vienen del body y se usan como `performed_by_name` en el audit log.

**Riesgo:** Audit trail sin integridad; atribución falseable. (Combinado con el no-auth de `reservation-notes`, el audit es totalmente forjable.)

**Fix:** Derivar `performed_by_name` siempre de la sesión (`staff.email`).

### M4 — Construcción de URLs REST crudas sin `encodeURIComponent` (query injection)
**Severidad:** MEDIO
**Archivos:** `src/app/api/admin/reservation-logs/route.ts:31`; `reservation-notes/route.ts:31,68,111,129`; `table-blocks/route.ts:23-26,80,109,161,177` (interpola `date`/`time_start`/`time_end`/`table_id`/`id`); `src/lib/utils/reservation-logger.ts:107` (`reservationId` sin escapar → query param injection); `src/lib/utils/table-blocks.ts:18,52`.

**Descripción:** `fetch(${SUPABASE_URL}/rest/v1/...?...=eq.${value})` con input del request interpolado sin escapar. *(El outlier correcto: `api/reservations/[id]/route.ts:24,44` usa `encodeURIComponent`.)*

**Riesgo:** Inyección de parámetros PostgREST (no SSRF a host externo, pero reshape de filtros). Errores de parse con strings de fecha/hora maliciosos.

**Fix:** `encodeURIComponent` cada valor; validar formato (`YYYY-MM-DD`, `HH:MM`) antes de interpolar. Idealmente migrar de `fetch` crudo al SDK.

### M5 — Datos operativos enviados a Groq (LLM tercer party) sin sanitización de prompt
**Severidad:** MEDIO
**Archivos:** `src/app/api/admin/informes-rayo/analyze/route.ts:10,25`; `analyze-v2/route.ts:10,25`; pipeline (`analysis-pipeline.ts:33-193`, `pipeline-v2.ts:121-238`)

**Descripción:** `reportData` sin Zod (solo check `!reportData.kpis`). El prompt se construye con template literals interpolando `staff_name`, `product_name`, revenue, márgenes, **nombres de staff** (no PII de clientes). Los valores no se escapan.

**Riesgo:** (1) Datos financieros + nombres de empleados a un LLM externo — revisar consentimiento/Terms. (2) Prompt injection desde datos de DB (un `product_name` malicioso). (3) `console.error` loguea el error completo (posibles fragmentos del prompt/respuestas de Groq) en `analyze/route.ts:25`, `analyze-v2/route.ts:25`, `productos-hora/route.ts:35`.

**Fix:** Documentar/obtener consentimiento para envío a Groq. Sanitizar valores interpolados (escapar comillas, tope longitud). Zod para `reportData`. Anonimizar staff a "Staff A/B/C" en el prompt. Loggear solo `error.message` + ID.

### M6 — `console.log`/`console.error` con datos sensibles en logs de Vercel
**Severidad:** MEDIO
**Archivos:**
- `src/app/api/admin/customers/route.ts:84,97` — loguea `admin.email` y la **longitud de la service key + URL** (`ENV check` debug).
- `src/app/api/admin/product-costs/route.ts:199` — `console.error('...', err)` objeto completo (costos).
- `src/app/api/admin/shift-assignments/route.ts:168,178` — resultados de notificación (PII).
- `src/app/api/admin/shift-schedules/[id]/publish/route.ts:139-149` — resultados de email (emails).
- `src/app/api/admin/nomina-import/route.ts:57-59,80-82` — errores Supabase completos.
- `src/lib/utils/reservation-logger.ts:52,64,77,89` — `response.text()` que puede ecoar el payload (PII de reservas).

**Riesgo:** PII/secret-metadata/financieros en logs de plataforma agregados.

**Fix:** Logger estructurado con redacción. Loguear `error.message` + correlation ID, no el objeto ni el body de respuesta.

### M7 — Cache poisoning con query params como cache keys
**Severidad:** MEDIO
**Archivos:** `src/app/api/admin/pos-dashboard/route.ts:682-686`; `pos-calendar/route.ts:52-56`

**Descripción:** `unstable_cache(fn, ['pos-dashboard', zoneParam, categoryParam, from, to], { revalidate: 300 })` usa valores crudos de query string como cache keys y como filtros DB, sin validar/normalizar. `from=<script>` se cachea y entra a `.gte`/`.lte`.

**Riesgo:** Polución de cache (crecimiento ilimitado de keys); errores cacheados 300s.

**Fix:** Validar/normalizar `from`/`to` (`YYYY-MM-DD`), `zone` (allowlist de zonas), `category` antes de usarlos como key y filtro.

### M8 — Date params no validados en queries
**Severidad:** MEDIO
**Archivos:** `pos-costs/route.ts:59-60`; `pos-dashboard/route.ts:51-52`; `pos-dashboard/detail/route.ts:194-197,240,263-264,463-464,520-521` (además `trimmedProductId` en `ilike` → wildcard expansion full-table); `informes-rayo/route.ts:9-14,21-22` (`from`/`to`/`zone`/`category` no validados); `nomina/route.ts:135-136,273-274` (defaults hardcoded `'2026-04-01'`/`'2026-04-30'` → datos stale); `availability` los valida bien ✓.

**Riesgo:** 500s, resultados vacíos, o full-table scans (ilike con `%`).

**Fix:** Validar fechas ISO; clampar rangos máximos; allowlist de zone/category.

### M9 — Non-atomic delete+insert (pérdida de datos en fallo parcial)
**Severidad:** MEDIO
**Archivos:** `shift-assignments/route.ts:111-119` (delete-then-insert de todas las asignaciones, no transaccional); `shift-type/route.ts:82-86,136-149` (segment insert/delete fire-and-forget sin check de error); `nomina-staff/route.ts:96-102` (alias insert sin check); `shift-checkin/route.ts:66-72` / `shift-checkout/route.ts:70-76` (insert `shift_novedades` sin check → audit gap).

**Riesgo:** Schedule vacío si el insert falla tras el delete; segmentos inconsistentes; audit trail incompleto.

**Fix:** Transacción (RPC/batch); verificar errores de inserts fire-and-forget.

### M10 — `salario` expuesto a roles que no lo necesitan
**Severidad:** MEDIO
**Archivos:** `shift-schedules/route.ts:44,110` (select `salario` a `lider_area`); `shift-my-week/route.ts:47-49,79,90,113` (devuelve `salario` en la response, incluso al propio empleado vía IDOR admin); `nomina-staff/route.ts:15` (a `store_admin`).

**Fix:** Quitar `salario` de selects no estrictamente necesarios.

### M11 — `pos-ingredients`: interpolación en `.or()`/`.not('in', …)` (PostgREST filter injection)
**Severidad:** MEDIO
**Archivo:** `src/app/api/admin/pos-ingredients/route.ts:21,34,38`

**Descripción:** Construye `.or('name.ilike.%NO USAR' + flags...)` y `.not('pos_category_id', 'in', '(${ids.map(id => '"${id}"').join(',')})')` a mano. `search` entra en `.ilike('name', '%${search}%')` sin escapar wildcards.

**Riesgo:** Un `search` con `,`/`.ilike.`/`is.null` puede alterar la semántica del `.or()`. Wildcard injection en ilike.

**Fix:** Usar la forma de objeto/array del SDK para `.or()`; escapar `%`/`_` en `search`; no construir strings de filtro PostgREST a mano.

### M12 — `as` casts inseguros en datos sensibles + debug internals al cliente
**Severidad:** MEDIO
**Archivos:**
- `dashboard/route.ts:37,87` — `as unknown as` en joins anidados.
- `reservations/[id]/route.ts:285,287` — `(reservation as any).time_end` innecesario.
- `inventory/combinations/route.ts:178` — `table_ids as string[]` sin guard `Array.isArray` (podría borrar filas equivocadas si es null).
- `customers/[id]/tags/route.ts:54` — `as unknown as Array<...>` (shape mismatch enmascarado).
- `sales-averages/route.ts:230-234` — devuelve `_debug` (paginación/cardinalidad) al cliente.
- `shift-my-week/route.ts:83-84` — `debug` object con IDs internos al cliente (posible al empleado).
- `reservations/[id]/table-options/route.ts:254-260` — bloque `_algorithm` al cliente.

**Riesgo:** Type-safety desactivada (42 ocurrencias) enmascara bugs de shape; debug internals exponen cardinalidad/IDs.

**Fix:** Usar tipos generados de Supabase (`Database['public']['Tables'][...]['Row']`). Gatear `_debug`/`debug` tras `NODE_ENV !== 'production'`.

### M13 — `day_index` inconsistente / fecha malformada evade regla de 24h
**Severidad:** MEDIO
**Archivo:** `src/app/api/admin/shift-novedades/route.ts:16-17,30-31,73-96`

**Descripción:** `date` del body sin validar; `new Date(date + 'T00:00:00')` → `Invalid Date` para input malformado → `horasAnticipacion` es `NaN` → `NaN < 24` es `false` → **se evada la regla de 24h de anticipación** para empleados. Además `getDayIndexFromDate` (línea 93-96) usa `d.getDay()` (0=Dom) que puede no coincidir con la convención de `day_index` del resto del sistema → mutar la asignación del día equivocado.

**Fix:** Zod `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`. Rechazar `Invalid Date` antes del check. Confirmar convención de `day_index`.

### M14 — `nomina-import` token con `===` (timing-unsafe)
**Severidad:** MEDIO
**Archivo:** `src/app/api/admin/nomina-import/route.ts:12-13`

**Fix:** `crypto.timingSafeEqual` sobre buffers de igual longitud.

### M15 — Falta de try/catch general → 500s no controlados
**Severidad:** MEDIO
**Archivo:** `src/app/api/auth/role/route.ts:5` (sin try/catch; si falla `getUser`/`getServiceClient` → 500 con stack en dev).

**Fix:** Envolver handler en try/catch; devolver 500 genérico.

---

## 5. DEUDA TÉCNICA (priorizada)

### D1 — Codebase duplicado (CRÍTICO estructural)
Existe una copia completa del proyecto en **dos repos git**:
- `/mnt/f/attick-keller/` — git root, con su propio `package.json`, `next.config.ts`, `src/` (87 rutas), `node_modules`, `migrations/`, `supabase/`, `pos-sync/`, `scripts/`, etc.
- `/mnt/f/attick-keller/web/` — git root anidado (dir de trabajo actual), también 87 rutas.
- Más `web/web/` vacío y `_web_archived/` en el padre.
- El `tsconfig.json` excluye `"web"` y `"_web_archived"`, lo que indica que el equipo sabe que hay duplicación pero no la ha resuelto.

**Riesgo:** Drift entre las dos copias; desplegar la equivocada; merges perdidos; tests/auditorías sobre la copia incorrecta. Esta auditoría se hizo sobre `web/` (dir de trabajo).

**Fix:** Decidir cuál es la fuente de verdad, archivar/borrar la otra, y unificar. Si `web/` es el app real, el `src/` del padre es código muerto peligroso.

### D2 — `typescript.ignoreBuildErrors = true`
**Archivo:** `next.config.ts:2`

Oculta todos los errores de tipo en build. Combinado con los 42 `as any`/`as unknown as` y el uso masivo de `any` en rutas de nómina/costos, significa que el type system no está protegiendo nada. Los `any` en agregaciones financieras (`nomina/route.ts:83,92-103`, `ops-costs/route.ts:14,119-153`) permiten coercions silenciosas.

**Fix:** Quitar `ignoreBuildErrors`, generar tipos de Supabase (`supabase gen types`), reemplazar `as any`/`any` con tipos reales. Resolver errores progresivamente.

### D3 — `getServiceClient()` duplicado / no centralizado del todo
- `src/app/api/reservations/route.ts:8-13` redefine su propio `getServiceClient` local en vez de importar de `admin-auth.ts`.
- 90 archivos usan service_role. Algunos (`reservation-logs`, `reservation-notes`, `table-blocks`, `reservation-logger.ts`, `table-blocks.ts`) construyen `fetch` crudo con la service key en vez de usar el SDK.
- `RESTAURANT_ID` hardcoded como literal `'a0000000-0000-0000-0000-000000000001'` (en vez de importar de constants) en: `pos-dashboard/day-of-week/route.ts:10`, `pos-ingredients/route.ts:29`, `reservation-notes/route.ts:6`, `table-blocks/route.ts:6`, `auth/route.ts:42`, `menu/route.ts:14,20`, `reservations/route.ts:6` (`RESTAURANT_ID_LOCAL` muerto), `zones/route.ts:13`, `table-blocks.ts:8`.

**Fix:** Importar siempre `getServiceClient` y `RESTAURANT_ID` de `@/lib/utils/admin-auth`. Eliminar los `fetch` crudos. Borrar `RESTAURANT_ID_LOCAL`.

### D4 — Sin rate limiting ni CSRF
- **Rate limiting:** ausente en toda la app. Crítico para `/api/auth` POST/PUT (spam de emails) y para las rutas admin no autenticadas (C1). Sin rate-limit, `/api/admin/reservation-notes` anónimo permite escritura ilimitada.
- **CSRF:** no hay protección CSRF. Las mutaciones usan cookies de sesión Supabase (same-site) + JSON POST. Al no haber `SameSite` explícito en cookies ni token CSRF ni `Origin`/`Sec-Fetch-Site` check, un ataque CSRF podría forzar acciones admin desde un sitio malicioso (aunque las cookies Supabase suelen ser `SameSite=Lax`, mitigando CSRF simple). Recomendable verificar la configuración de cookies de `@supabase/ssr` y añadir check de `Origin` en mutaciones sensibles.

**Fix:** Rate limiting (Vercel Edge Middleware o Upstash) por IP/email en `/api/auth` y en endpoints sensibles. Verificar `SameSite`/`Secure` en cookies y/o validar header `Origin`/`Sec-Fetch-Site` en POST/PUT/PATCH/DELETE.

### D5 — CSP permite `unsafe-inline` y `unsafe-eval`
**Archivo:** `next.config.ts` (header `Content-Security-Policy`): `script-src 'self' 'unsafe-inline' 'unsafe-eval'`.

`unsafe-eval` debilita fuertemente la protección XSS (permite `eval`, `new Function`). `unsafe-inline` permite scripts inline. Es necesario para algunas libs, pero `unsafe-eval` debería eliminarse si es posible (revisar qué lo requiere — quizá recharts/alguna lib de gráficos).

**Fix:** Auditoría de qué requiere `unsafe-eval`; migrar a nonces/hash-based CSP para `unsafe-inline`; quitar `unsafe-eval` si nadie lo usa.

### D6 — Errores TS silenciados y type-safety desactivada
- 42 `as any`/`as unknown as` en rutas.
- `product-costs/route.ts:16,50,52,...` deshabilita explícitamente `@typescript-eslint/no-explicit-any` con eslint-disable.
- `as unknown as TableRow[] | null`, `Record<string, any>` en `reservations/route.ts:339` (update payload sin check).
- `as Record<string, unknown>` en `inventory/combinations/route.ts:45,53,109,118,178`.

### D7 — Código muerto / lógica rota detectada
- `customers/analytics/trends/route.ts:79-84` — `recurringThisWeek` calculado y nunca usado; `retentionPct` mal etiquetado.
- `pos-dashboard/day-of-week/route.ts:121-126` — loop `for (const s of []) {}` (itera array vacío literal).
- `pos-dashboard/day-of-week/route.ts:10` — `const RESTAURANT_ID = '...'` sombrea el importado.
- `shift-type/route.ts:171` — comentario "Verificar que no haya asignaciones" pero el código NO verifica → orfandad referencial al borrar `shift_type`.
- `inventory/tables/[id]/route.ts:48-67` — DELETE hard-delete sin pre-check de dependencias (a diferencia de `zones/route.ts:102-116` que sí lo hace).
- `nomina/route.ts:135-136,273-274` — defaults de fecha hardcoded `'2026-04-01'` → datos stale.

### D8 — `unstable_cache`/fetch paginados que truncan resultados en error
- `pos-dashboard/detail/route.ts:33,470,1029` — `fetchPaginated` hace `if (error) break` → devuelve datos parciales como completos con 200 (reportes financieros incorrectos).
- `pos-costs/route.ts:129-166` — errores en suppliers/items se swallow (`if (suppliers)`).

### D9 — Dependencias vulnerables (npm audit)
- **4 vulnerabilidades** (3 moderadas, 1 crítica según advisory de dompurify):
  - `dompurify` <3.4.0 (XSS en varios modos) — transitive vía `jspdf@<=4.2.0`. `npm audit fix --force` instalaría `jspdf@4.2.1` (breaking). **Riesgo:** si `jspdf` renderiza HTML controlado por usuario a PDF (p. ej. templates/exports), XSS/HTML injection podría materializarse. Auditar usos de `jspdf.html()`.
  - `postcss` <8.5.10 (XSS vía `</style>` no escapado) — transitive vía `next`. `npm audit fix --force` bajaría a `next@9.3.3` (no viable). Monitorear actualización de Next.
- Ninguna es dependencia directa con exploit trivial en este contexto, pero dompurify/jspdf merecen actualización.

### D10 — PII/financieros en logs de Vercel
(Véase M6.) Sin logger estructurado ni redacción.

---

## 6. PLAN DE ACCIÓN (fases por prioridad)

### Fase 0 — Hotfix inmediato (esta semana, bloquea explotación activa)
1. **Añadir auth a las 3 rutas sin auth** (`reservation-notes`, `reservation-logs`, `table-blocks`) — `getStaffUser` + 403 en cada método. [C1]
2. **Añadir `getAdminUser` a `/api/admin/informes-rayo/margins`**. [C2]
3. **`/api/auth` POST/PUT**: exigir sesión del propio usuario + rate-limit por IP/email. [C3]
4. **`/api/admin/debug`**: mover auth a la primera línea; eliminar rama pre-auth; quitar `ALLOW_DEBUG` o gatear por `super_admin`+IP. [C4]
5. **`/api/admin/staff` POST**: solo `super_admin` puede otorgar `store_admin`/`super_admin` y crear cuentas (check de jerarquía). [C5]
6. **`/api/admin/nomina-import`**: restringir a `super_admin`; Zod por tabla; scope `restaurant_id`. [C6]
7. **`/api/admin/pos-upload`**: allowlist de columnas + `restaurant_id` server-side. [C7]

### Fase 1 — Cerrar IDOR y fugas (2 semanas)
8. Añadir `.eq('restaurant_id', RESTAURANT_ID)` a **todo** lookup/update/delete por `id` (usar `internal-notes/route.ts` como template). [A1]
9. Fijar el filtro roto `customers/ids/route.ts:32`. [A8]
10. Reemplazar todos los `return { error: error.message/stack/response.text() }` por mensaje genérico + log server-side. [A4]
11. Derivar `performed_by_name` de la sesión (no del body). [M3]
12. Sanitizar `body_html` con DOMPurify server-side. [A6]
13. Enmascarar PII (email/teléfono) para rol `host`. [A9]
14. Rate-limiting global + verificación CSRF/`Origin`. [D4]

### Fase 2 — Validación de input y type-safety (1 mes)
15. Crear `src/lib/schemas/` con Zod por endpoint; aplicar `.safeParse` en todas las POST/PUT/PATCH. [M1]
16. Bound `weeks`, `days`, `limit/offset`; validar fechas ISO y allowlists de zone/category. [M2, M8]
17. Quitar `typescript.ignoreBuildErrors`; generar tipos Supabase; eliminar `as any`/`any` en rutas de nómina/costos. [D2, D6]
18. Migrar `fetch` crudo → SDK; `encodeURIComponent` en interpolaciones. [M4]

### Fase 3 — Deuda estructural (1-2 meses)
19. **Resolver el codebase duplicado**: elegir fuente de verdad, archivar la otra. [D1]
20. Centralizar `getServiceClient`/`RESTAURANT_ID`; borrar duplicados. [D3]
21. Hardening CSP (quitar `unsafe-eval`, nonces para `unsafe-inline`). [D5]
22. Transaccionalidad en delete+insert (shift-assignments, shift-type). [M9]
23. Quitar `salario` de selects innecesarios; quitar `_debug`/`debug` de responses de producción. [M10, M12]
24. Logger estructurado con redacción de PII. [M6, D10]
25. `npm audit fix --force` para jspdf→dompurify; auditar usos de `jspdf.html()`. [D9]
26. Revisar consentimiento de envío de datos a Groq; sanitizar prompts; anonimizar staff. [M5]

### Fase 4 — Defensa en profundidad (continuo)
27. Para operaciones user-scoped, migrar de service_role a cliente anon+RLS (la DB enforce ownership). [A5]
28. Scope `customer_stats` por `restaurant_id` (las rutas de analytics escanean la tabla completa sin tenancy). [A1-analytics]
29. Limitar service role de Seadotec a read-only scoped. [A7]
30. Revisar day_index; validar `date` en shift-novedades para no evadir la regla 24h. [M13]

---

## Apéndice — Verificación de configuración (positiva)

| Check | Estado |
|---|---|
| `NEXT_PUBLIC_*` sin secrets | ✓ (solo URL, anon keys, phone/instagram/address; anon keys es esperado) |
| `SUPABASE_SERVICE_ROLE_KEY` server-side only | ✓ (no en `NEXT_PUBLIC`) |
| `GROQ_API_KEY` server-side | ✓ (`process.env.GROQ_API_KEY`, no `NEXT_PUBLIC`) |
| `RODRI_SUPABASE_SERVICE_ROLE_KEY` server-side | ✓ (no `NEXT_PUBLIC`) |
| Helpers de auth centralizados | ✓ `src/lib/utils/admin-auth.ts` |
| Middleware protege páginas por rol | ✓ |
| `/api/auth/role` no confía en claims del cliente | ✓ (lee de DB por `user.id` de sesión) |
| Prompts IA no envían PII de clientes | ✓ (sí envían nombres de staff y financieros) |
| Headers de seguridad básicos | ✓ (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) |
| Validación de input ejemplar | ✓ `api/availability/route.ts:66-86` |
| `internal-notes/route.ts` scoping correcto | ✓ (template a seguir para IDOR) |

---

*Auditoría generada por revisión exhaustiva de las 87 rutas + middleware + config + dependencias. Las referencias `archivo:línea` fueron verificadas contra el código en `/mnt/f/attick-keller/web/` (dir de trabajo).*