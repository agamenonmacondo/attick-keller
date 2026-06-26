# Auditoría: Componentes Afectados + Fixes Seguros (sin romper funcionalidad)

**Fecha:** 2026-06-17  
**Objetivo:** Cada hallazgo mapeado a componentes UI que lo consumen, qué se rompe si se arregla mal, y el fix exacto que NO rompe nada.

---

## LEGENDA DE IMPACTO

| Icono | Significado |
|-------|-------------|
| 🟢 | Fix transparente — no afecta UI |
| 🟡 | Fix requiere ajuste menor en UI (headers/cookies) |
| 🔴 | Fix requiere refactor significativo |

---

## C1 — Rutas admin SIN auth (reservation-notes, reservation-logs, table-blocks)

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| `NotesPanel.tsx` | Admin ReservationDetail + Host HostReservationQueue | `fetch('/api/admin/reservation-notes?reservation_id=...')` (GET), POST, DELETE |
| `AuditTimeline.tsx` | Admin ReservationDetail + Host HostReservationQueue | `fetch('/api/admin/reservation-logs?reservation_id=...')` (GET) |
| `table-blocks.ts` (util) | Llamado desde server-side en assignTable y floorplan | `fetch(${SUPABASE_URL}/rest/v1/table_blocks?...)` |

### Qué se rompe si el fix es MALO
- Si añadimos auth que exige cookie de sesión → los fetch del cliente FUNCIONAN porque las cookies se envían automáticamente (same-origin)
- PERO `table-blocks.ts` y `reservation-logger.ts` llaman a Supabase REST directamente (no vía API route), usando `SUPABASE_URL` + `SERVICE_ROLE_KEY` → estos son **server-side utils** que NO pasan por la API route

### Fix seguro 🟢 (NO rompe nada)

```ts
// reservation-notes/route.ts — añadir al inicio de CADA método:
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  // ... resto igual, pero migrar de fetch crudo a SDK:
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('reservation_notes')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: true })
  // ...
}
```

**Impacto UI:** Ninguno. Los componentes (`NotesPanel`, `AuditTimeline`) ya envían cookies automáticamente (same-origin fetch). Los usuarios logueados no notan diferencia. Solo se bloquean requests sin sesión.

**Nota sobre `table-blocks.ts` y `reservation-logger.ts`:** Estos son UTILS del servidor que corren dentro de otras API routes que YA tienen auth. No necesitan fix propio, pero sí necesitan `encodeURIComponent()` en los IDs interpolados.

---

## C2 — `/api/admin/informes-rayo/margins` SIN auth

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| `useProductMargins.ts` (hook) | InformesRayoPanel | `fetch('/api/admin/informes-rayo/margins?...')` |
| `PDFExportButton.tsx` | InformesRayoPanel | `fetch('/api/admin/informes-rayo/margins?...')` |

### Qué se rompe si el fix es MALO
- Si añadimos `getAdminUser` y la página la llama un `host` → el host NO tiene acceso a márgenes (correcto, es dato financiero)
- PERO `InformesRayoPanel` ya está detrás de middleware que requiere rol `store_admin` o `super_admin` para ver `/admin`

### Fix seguro 🟢

```ts
// margins/route.ts — añadir al inicio:
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  // ... resto igual
}
```

**Impacto UI:** Ninguno. La página `/admin/informes` ya requiere autenticación (middleware). Los admins logueados pasan el check.

**Riesgo:** Si un `host` o `lider_area` navega a la URL directa → 403 (correcto, márgenes son solo para admin).

---

## C3 — `/api/auth` POST/PUT SIN auth ni rate-limit

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| `login/page.tsx` | `/auth/login` | `fetch('/api/auth', { method: 'POST' })` |
| `signup/page.tsx` | `/auth/signup` | `fetch('/api/auth', { method: 'POST' })` |
| `auth-provider.tsx` | Global | `fetch('/api/auth', { method: 'PUT' })` (password reset) |

### Qué se rompe si el fix es MALO
- Si exigimos sesión para POST (auto-confirmar email) → nuevo usuario no puede registrarse
- Si añadimos rate-limit agresivo → legítimos resets de contraseña se bloquean

### Fix seguro 🟡 (requiere cuidado en el flujo de signup)

```ts
// auth/route.ts — POST (signup/auto-confirm):
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests por IP por hora
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  // (implementar con Map en memoria o Upstash para Vercel)
  
  const body = await request.json()
  const { email, name } = body
  
  // Validar email con Zod
  if (!email || !z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  
  // ... resto igual (auto-confirmar SOLO si el email ya existe en auth)
}

// auth/route.ts — PUT (password reset):
export async function PUT(request: NextRequest) {
  // Rate limit: 3 requests por email por hora
  const body = await request.json()
  const { email } = body
  
  if (!email || !z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  
  // Usar el flujo nativo de Supabase en vez de admin.generateLink
  const { error } = await sb.auth.resetPasswordForEmail(email)
  // ...
}
```

**Impacto UI:** Mínimo. El flujo de signup/login no cambia para usuarios legítimos. Rate-limit solo afecta abuso.

**PITFALL:** NO cambiar `resetPasswordForEmail` por `admin.generateLink` en PUT — el flujo nativo es más seguro y no expone el link en la API response.

---

## C4 — `/api/admin/debug` filtra metadata ANTES del auth

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| Ninguno UI | Solo uso manual por devs | Navegador directo a `/api/admin/debug` |

### Fix seguro 🟢 (no hay UI que lo consuma)

```ts
// debug/route.ts — mover auth a la PRIMERA línea:
export async function GET(request: NextRequest) {
  // AUTH CHECK PRIMERO — antes de cualquier otra cosa
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  
  // Solo super_admin puede usar debug
  if (admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo super_admin' }, { status: 403 })
  }
  
  if (process.env.ALLOW_DEBUG !== 'true') {
    return NextResponse.json({ error: 'Debug endpoint disabled' }, { status: 404 })
  }
  // ... resto igual
}
```

**Impacto UI:** Ninguno. No hay componente frontend que llame este endpoint.

---

## C5 — Escalada de privilegios: `store_admin` crea `super_admin`

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| `TeamPanel.tsx` | `/admin` → tab Equipo | `fetch('/api/admin/staff')` (GET), `fetch('/api/admin/staff', { method: 'POST' })` |

### Qué se rompe si el fix es MALO
- Si `POST /api/admin/staff` rechaza `store_admin` completamente → `store_admin` no puede agregar empleados
- Si eliminamos `auth.admin.createUser` → no se crean cuentas de auth nuevas

### Fix seguro 🟡 (ajuste fino en roles)

```ts
// staff/route.ts — POST: restringir creación de super_admin/store_admin a super_admin
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  
  const body = await request.json()
  const { email, name, role, area } = body
  
  // store_admin SOLO puede crear roles inferiores (colaborador, reservante, lider_area, host)
  // super_admin puede crear cualquier rol
  const ADMIN_CREATABLE_ROLES = ['colaborador', 'reservante', 'lider_area', 'host']
  const SUPER_CREATABLE_ROLES = ['store_admin', 'super_admin', ...ADMIN_CREATABLE_ROLES]
  
  const allowedRoles = admin.role === 'super_admin' ? SUPER_CREATABLE_ROLES : ADMIN_CREATABLE_ROLES
  
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ 
      error: `No tienes permiso para crear rol '${role}'` 
    }, { status: 403 })
  }
  
  // ... resto igual (crear auth user si no existe)
}
```

**Impacto UI:** `TeamPanel` necesita ajuste menor — ocultar opciones `super_admin`/`store_admin` del dropdown de roles si el usuario es `store_admin`. Esto es cambio de UI simple.

**PITFALL:** NO eliminar `auth.admin.createUser` — es necesario para el flujo de invitación. Solo restringir QUIÉN puede invocarlo.

---

## C6 — `/api/admin/nomina-import` escritura masiva sin validación

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| Ninguno UI directo | Script externo (POS sync) | `fetch('/api/admin/nomina-import', { headers: { 'X-Import-Token': ... } })` |

### Qué se rompe si el fix es MALO
- Si eliminamos `X-Import-Token` → el script de sync no puede importar nómina
- Si restringimos a `super_admin` solo → el script necesita token, no sesión

### Fix seguro 🟢 (token + Zod + allowlist)

```ts
// nomina-import/route.ts:
import { timingSafeEqual } from 'crypto'

function isAuthorized(request: NextRequest): boolean {
  const token = request.headers.get('X-Import-Token')
  if (!token || !IMPORT_TOKEN) return false
  // Timing-safe comparison
  return timingSafeEqual(Buffer.from(token), Buffer.from(IMPORT_TOKEN))
}

export async function POST(request: NextRequest) {
  // Token OR super_admin
  const tokenAuth = isAuthorized(request)
  const admin = await getAdminUser(request)
  
  if (!tokenAuth && (!admin || admin.role !== 'super_admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  const body = await request.json()
  const { action, data } = body
  
  // Zod validation for each table
  // ... (allowlist de columnas por tabla)
  
  // Forzar restaurant_id
  const enrichedData = data.map((row: any) => ({
    ...row,
    restaurant_id: RESTAURANT_ID
  }))
  // ...
}
```

**Impacto UI:** Ninguno. El script externo sigue usando token. Solo se añade validación + restaurant_id.

---

## C7 — `/api/admin/pos-upload` upsert crudo sin allowlist

### Componentes afectados

| Componente | Página | Llamada |
|-----------|--------|---------|
| `DataUploadSection.tsx` | POS Dashboard → Upload | `fetch('/api/admin/pos-upload', { method: 'POST', body: ... })` |

### Fix seguro 🟡 (allowlist de columnas)

```ts
// pos-upload/route.ts — añadir allowlist por tabla:
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  pos_sales: ['pos_folio', 'pos_series', 'pos_staff_id', 'opened_at', 'closed_at', 'total', 'tip', 'tax1', 'tax2', 'is_paid', 'is_cancelled', 'restaurant_id', 'pos_area_id', 'pos_payment_method_id', 'party_size', 'service_time_minutes'],
  pos_sale_items: ['id', 'pos_folio', 'pos_series', 'pos_product_id', 'quantity', 'unit_price', 'total_price', 'pos_product_group_id'],
  pos_products: ['pos_product_id', 'pos_product_group_id', 'name', 'price', 'cost', 'is_active', 'restaurant_id'],
  pos_product_groups: ['pos_product_group_id', 'name', 'group_number', 'is_active', 'restaurant_id'],
  pos_staff: ['pos_staff_id', 'name', 'pos_area_id', 'is_active', 'restaurant_id'],
  pos_areas: ['pos_area_id', 'name', 'restaurant_id'],
  pos_sale_payments: ['id', 'pos_folio', 'pos_series', 'pos_payment_method_id', 'amount', 'tip_amount', 'restaurant_id'],
  pos_payment_methods: ['pos_payment_method_id', 'name', 'restaurant_id'],
}

// En el loop de upsert:
for (const row of batch) {
  // Solo permitir columnas del allowlist
  const filtered = Object.fromEntries(
    Object.entries(row).filter(([key]) => COLUMN_ALLOWLIST[table]?.includes(key))
  )
  // Forzar restaurant_id
  filtered.restaurant_id = RESTAURANT_ID
  cleanedBatch.push(filtered)
}
```

**Impacto UI:** `DataUploadSection` no cambia. El JSON que envía ya tiene las columnas correctas. Solo se filtran columnas extrañas.

---

## A1 — IDOR sistémico: lookups por `id` sin `restaurant_id`

### Componentes afectados (los que hacen fetch por ID)

| Ruta | Componente | Riesgo |
|------|-----------|--------|
| `reservations/[id]/route.ts` | ReservationDetail, FloorPlanMap | Por ID sin tenant scope |
| `reservations/[id]/table-options/route.ts` | AssignTablePopup | Por ID sin tenant scope |
| `menu/[id]/recipe/route.ts` | (admin) | Lee costos de cualquier menú |
| `pos-products/[id]/route.ts` | (admin) | Lee costos de cualquier producto |
| `customers/[id]/tags/route.ts` | CustomerDetail | Tags sin ownership |
| `shift-my-hours/route.ts` | mi-turno page | IDOR por employee_id |
| `shift-novedades/route.ts` | ShiftSchedulePanel | IDOR por employee_id |

### Fix seguro 🟢 (añadir `.eq('restaurant_id', RESTAURANT_ID)` en el query)

```ts
// Template — aplicar a TODAS las rutas que buscan por ID:
// ANTES (vulnerable):
const { data } = await sb.from('reservations').select('*').eq('id', id).single()

// DESPUÉS (seguro):
const { data } = await sb.from('reservations').select('*').eq('id', id).eq('restaurant_id', RESTAURANT_ID).single()
```

**Impacto UI:** Ninguno. Los componentes no cambian. El filtro adicional solo afecta la query de BD — si el ID pertenece al restaurante correcto, retorna lo mismo. Si no, retorna 404 (correcto).

**PITFALL:** Para tablas que NO tienen `restaurant_id` directo (como `reservation_notes`, `pos_sale_items`), el fix es scopear vía la tabla padre:
```ts
// reservation_notes — scope vía reservation:
const { data: reservation } = await sb.from('reservations').select('id').eq('id', reservationId).eq('restaurant_id', RESTAURANT_ID).single()
if (!reservation) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
// Ahora seguro para consultar notes de esa reservation
```

---

## A4 — `error.message`/stack al cliente (~40 puntos)

### Fix seguro 🟢 (patrón global)

```ts
// Crear src/lib/utils/error-handler.ts:
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`[${context}]`, error) // Log server-side
  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  )
}

// En cada route.ts, reemplazar:
// ANTES: return NextResponse.json({ error: error.message }, { status: 500 })
// DESPUÉS: return handleApiError(error, 'reservations/GET')
```

**Impacto UI:** Ninguno. Los componentes ya manejan errores genéricos. Solo cambia el mensaje de error de "column X does not exist" a "Error interno" — que es lo correcto.

---

## A9 — PII (email/teléfono) expuesta al rol `host`

### Componentes afectados

| Componente | Página | Datos expuestos |
|-----------|--------|----------------|
| `FloorPlanMap.tsx` (via floorplan API) | Admin + Host | customer_phone, customer_email |
| HostReservationQueue (via occupancy API) | Host | customer_phone, customer_email, special_requests, internal_notes |

### Fix seguro 🟡 (enmascarar en la API, no en el componente)

```ts
// occupancy/route.ts — enmascarar PII para host:
const maskPII = (reservation: any, callerRole: string) => {
  if (callerRole === 'host' || callerRole === 'lider_area') {
    return {
      ...reservation,
      customer_phone: reservation.customer_phone 
        ? `***${reservation.customer_phone.slice(-4)}` 
        : null,
      customer_email: null, // Host no ve email
    }
  }
  return reservation
}
```

**Impacto UI:** Los componentes Host necesitan ajuste menor — mostrar "****1234" en vez de teléfono completo. Los Admins ven todo igual.

---

## D1 — Codebase duplicado

### Componentes afectados

| Path | ¿Cuál es la fuente de verdad? |
|------|------------------------------|
| `/mnt/f/attick-keller/src/` | Copia espejo (NO se deploya) |
| `/mnt/f/attick-keller/web/src/` | **Fuente de verdad** (Vercel deploya desde aquí) |
| `/mnt/f/attick-keller/web/web/` | Vacío, basura |
| `/mnt/f/attick-keller/_web_archived/` | Archivo viejo |

### Fix seguro 🟢 (no rompe nada — es limpieza)

1. **Eliminar** `web/web/` (vacío)
2. **Eliminar** `_web_archived/` (archivo viejo)
3. **Archivar** `src/` en la raíz → ya no se mantiene sincronizado
4. **Verificar** con `git diff --stat web/src/ src/` que no hay cambios divergentes

**PITFALL:** Confirmar con `diff -r web/src/ src/` que son idénticos ANTES de eliminar.

---

## D3 — `getServiceClient()` duplicado + RESTAURANT_ID hardcoded

### Archivos con duplicados

| Archivo | Problema |
|---------|----------|
| `reservations/route.ts:8-13` | Redefine `getServiceClient` local |
| `reservation-notes/route.ts:5-6` | Hardcoded `RESTAURANT_ID` + `SERVICE_ROLE_KEY` |
| `reservation-logs/route.ts:3-4` | Hardcoded `SERVICE_ROLE_KEY` |
| `table-blocks/route.ts:4-6` | Hardcoded `RESTAURANT_ID` + keys |
| `pos-dashboard/day-of-week/route.ts:10` | Hardcoded `RESTAURANT_ID` |
| `pos-ingredients/route.ts:29` | Hardcoded `RESTAURANT_ID` inline |
| `auth/route.ts:42` | Hardcoded `RESTAURANT_ID` inline |
| `menu/route.ts:14,20` | Hardcoded `RESTAURANT_ID` inline |
| `zones/route.ts:13` | Hardcoded `RESTAURANT_ID` inline |

### Fix seguro 🟢 (importar desde constants)

```ts
// ANTES (en reservation-notes):
const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

// DESPUÉS:
import { RESTAURANT_ID } from '@/lib/utils/constants'
```

**Impacto UI:** Ninguno. Es solo refactor de imports. Los valores son idénticos.

---

## M1 — Cero validación Zod

### Estrategia de implementación gradual (no rompe nada)

**Fase 1 (ahora):** Crear schemas para las rutas CRÍTICAS (C1-C7):
```ts
// src/lib/schemas/reservation-notes.ts
export const createNoteSchema = z.object({
  reservation_id: z.string().uuid(),
  note: z.string().min(1).max(2000),
  author_name: z.string().min(1).max(100),
  author_id: z.string().uuid().optional(),
})
```

**Fase 2 (próximo sprint):** Schemas para las rutas de mutation restantes.

**Impacto UI:** Ninguno si los schemas matchean los tipos que la UI ya envía. Solo protege contra input malformado.

---

## M4 — URLs REST sin `encodeURIComponent`

### Archivos afectados

| Archivo | Fix |
|--------|-----|
| `reservation-logs/route.ts:31` | Migrar a SDK o `encodeURIComponent(reservationId)` |
| `reservation-notes/route.ts:31,68,111,129` | Migrar a SDK |
| `table-blocks/route.ts:23-26,80,109,161,177` | Migrar a SDK |
| `reservation-logger.ts:107` | `encodeURIComponent(reservationId)` |
| `table-blocks.ts:18,52` | `encodeURIComponent(date, timeStart, timeEnd)` |

### Fix seguro 🟡 (migrar de fetch crudo a SDK)

**Opción A (mínimo riesgo):** Solo añadir `encodeURIComponent()` — no cambia la estructura, solo escapa los valores.

**Opción B (mejor largo plazo):** Migrar a Supabase SDK — elimina todo el fetch crudo.

```ts
// ANTES (fetch crudo vulnerable):
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/reservation_notes?reservation_id=eq.${reservationId}`,
  { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
)

// DESPUÉS Opción A (quick fix):
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/reservation_notes?reservation_id=eq.${encodeURIComponent(reservationId)}`,
  { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
)

// DESPUÉS Opción B (SDK — mejor):
const sb = getServiceClient()
const { data, error } = await sb
  .from('reservation_notes')
  .select('*')
  .eq('reservation_id', reservationId)
  .order('created_at', { ascending: true })
```

**Impacto UI:** Ninguno. Los componentes no cambian, solo la API route.

---

## RESUMEN DE IMPACTO POR COMPONENTE

| Componente UI | Hallazgos que afectan | Cambio necesario | Riesgo |
|---------------|----------------------|------------------|--------|
| `NotesPanel.tsx` | C1, M4 | Ninguno (cookies automáticas) | 🟢 |
| `AuditTimeline.tsx` | C1 | Ninguno (cookies automáticas) | 🟢 |
| `InformesRayoPanel.tsx` | C2 | Ninguno (ya tras middleware admin) | 🟢 |
| `PDFExportButton.tsx` | C2 | Ninguno | 🟢 |
| `login/page.tsx` | C3 | Rate-limit no afecta flujo normal | 🟡 |
| `signup/page.tsx` | C3 | Rate-limit no afecta flujo normal | 🟡 |
| `auth-provider.tsx` | C3 | Mismo | 🟡 |
| `TeamPanel.tsx` | C5 | Ocultar roles superiores del dropdown | 🟡 |
| `DataUploadSection.tsx` | C7 | Allowlist filtra columnas extra — transparente | 🟢 |
| `ReservationDetail.tsx` | A1 | Ninguno (query filter en server) | 🟢 |
| `HostReservationQueue.tsx` | A9 | Mostrar phone enmascarado | 🟡 |
| `FloorPlanMap.tsx` | A9 | Mostrar phone enmascarado | 🟡 |
| `CustomerDetail.tsx` | A1 | Ninguno (query filter en server) | 🟢 |
| `ShiftSchedulePanel.tsx` | A3, M13 | Ninguno (auth ya en API) | 🟢 |
| `mi-turno/page.tsx` | A3 | Ninguno (empleado ve sus datos) | 🟢 |
| **Ningún componente** | C4 (debug), C6 (nomina-import) | Sin UI consumidora | 🟢 |

---

## ORDEN DE EJECUCIÓN (menor riesgo → mayor riesgo)

### Batch 1 — Hotfixes sin impacto UI (1-2 horas)

1. **C1** — Auth en 3 rutas (reservation-notes, reservation-logs, table-blocks)
2. **C2** — Auth en margins
3. **C4** — Auth primero en debug + restringir a super_admin
4. **D3** — Importar RESTAURANT_ID de constants
5. **M4 Opción A** — `encodeURIComponent()` en fetches crudos

### Batch 2 — Fixes con ajuste menor en UI (2-4 horas)

6. **C5** — Restringir creación de super_admin (ajustar dropdown en TeamPanel)
7. **A4** — Error handler global (reemplazar `error.message` por genérico)
8. **A1** — Añadir `.eq('restaurant_id', RESTAURANT_ID)` en lookups por ID
9. **A9** — Enmascarar PII para rol host (ajustar display en FloorPlanMap y HostReservationQueue)

### Batch 3 — Validación y rate-limit (1 semana)

10. **C3** — Rate-limit en /api/auth + Zod para email
11. **C6** — Token timing-safe + Zod en nomina-import
12. **C7** — Allowlist de columnas en pos-upload
13. **M1** — Schemas Zod para rutas críticas

### Batch 4 — Deuda técnica (1-2 meses)

14. **D1** — Eliminar codebase duplicado
15. **D2** — Quitar `ignoreBuildErrors`
16. **D5** — Hardening CSP
17. **M4 Opción B** — Migrar fetch crudo a SDK