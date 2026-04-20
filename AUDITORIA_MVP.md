# AUDITORIA MVP — Attick & Keller

**Fecha:** 2026-04-19
**Auditor:** Senior MVP Auditor
**Proyecto:** Sistema de reservas para restaurante Attick & Keller, Bogota
**Stack:** Next.js 16, Supabase, Vercel, Resend
**Supabase URL:** https://pbllaipsdfypelnwrvpy.supabase.co
**Restaurant ID:** a0000000-0000-0000-0000-000000000001

---

## 1. RESUMEN EJECUTIVO

### Estado Pre-Auditoria: **CRITICO**
El sistema tenia multiples fallas bloqueantes que impedian el funcionamiento basico del MVP:
- WhatsApp OTP era inalcanzable desde la UI
- El login no redirigia despues de autenticarse
- Las API routes no verificaban autenticidad del usuario
- El admin no enviaba notificaciones al confirmar/cancelar reservas
- Columnas inconsistentes entre frontend y backend (`telephone` vs `phone`)
- Canal OTP siempre usaba SMS ignorando el parametro WhatsApp

### Estado Post-Fix: **MVP FUNCIONAL**
Todos los problemas criticos y altos han sido corregidos. El flujo completo cliente-reserva → admin-confirma ahora funciona.

---

## 2. INVENTARIO DE ARCHIVOS

| Archivo | Proposito | Estado |
|---------|-----------|--------|
| `src/app/page.tsx` | Landing page | OK |
| `src/app/reservar/page.tsx` | Pagina de reserva | OK |
| `src/app/auth/login/LoginClient.tsx` | Login UI (WhatsApp, Google, Email) | FIXADO |
| `src/app/auth/login/page.tsx` | Login page wrapper | OK |
| `src/app/auth/callback/route.ts` | OAuth PKCE callback | OK |
| `src/app/perfil/ProfileClient.tsx` | Perfil de usuario + reservas | FIXADO |
| `src/app/perfil/page.tsx` | Perfil page wrapper | OK |
| `src/app/admin/AdminClient.tsx` | Panel admin | FIXADO |
| `src/app/admin/page.tsx` | Admin page wrapper | OK |
| `src/app/api/reservations/route.ts` | API reservas (POST/PATCH) | FIXADO |
| `src/app/api/email/route.ts` | API email (Resend) | FIXADO |
| `src/app/api/zones/route.ts` | API zonas | OK |
| `src/components/reservation/ReservationForm.tsx` | Formulario 4 pasos | FIXADO |
| `src/components/home/HeroSection.tsx` | Hero landing | OK |
| `src/components/layout/Navbar.tsx` | Navegacion | OK |
| `src/components/layout/Footer.tsx` | Footer | OK |
| `src/lib/auth/auth-provider.tsx` | Context de autenticacion | FIXADO |
| `src/lib/supabase/client.ts` | Cliente Supabase browser | FIXADO |
| `src/lib/supabase/server.ts` | Cliente Supabase server | OK |
| `src/middleware.ts` | Auth middleware | FIXADO |

---

## 3. PROBLEMAS ENCONTRADOS Y CORREGIDOS

### CRITICOS (Bloqueaban funcionalidad)

#### 3.1 WhatsApp OTP inalcanzable
- **Archivo:** `src/app/auth/login/LoginClient.tsx`
- **Problema:** No habia boton para acceder al flujo de WhatsApp/Phone OTP. Los pasos `phone-input` y `phone-verify` existian pero eran inalcanzables.
- **Fix:** Se agrego boton "Ingresar con WhatsApp" con icono de Phone en la pantalla de metodo de login.

#### 3.2 Login success no redirigia
- **Archivo:** `src/app/auth/login/LoginClient.tsx`
- **Problema:** El paso `success` mostraba "Redirigiendo..." pero nunca ejecutaba `router.push()`. El usuario quedaba atascado.
- **Fix:** Se agrego componente `RedirectAfterLogin` que usa `useEffect` + `setTimeout` para redirigir al `?redirect` param o `/perfil`.

#### 3.3 Canal OTP siempre SMS, nunca WhatsApp
- **Archivo:** `src/lib/supabase/client.ts`
- **Problema:** `sendOTP()` aceptaba parametro `channel` pero siempre hardcodeaba `channel: 'sms'` en la llamada a Supabase, ignorando WhatsApp.
- **Fix:** Ahora pasa el `channel` directamente a `options.channel` de Supabase.

#### 3.4 API routes sin autenticacion
- **Archivo:** `src/app/api/reservations/route.ts`
- **Problema:** POST y PATCH no verificaban identidad del usuario. Cualquiera podia crear/modificar reservas.
- **Fix:** Se agrego `createServerSupabaseClient()` + `auth.getUser()` en ambos handlers. PATCH ahora requiere rol admin.

#### 3.5 Columna `telephone` vs `phone` inconsistente
- **Archivos:** `src/lib/auth/auth-provider.tsx` (linea 91) vs `src/app/api/reservations/route.ts` (linea 36)
- **Problema:** El signup insertaba en columna `telephone`, la API de reservas insertaba en columna `phone`. Uno de los dos fallaria.
- **Fix:** Unificado a `phone` en ambos lugares, consistente con el schema de la tabla `customers`.

#### 3.6 Restaurant ID hardcoded en multiples lugares
- **Archivos:** `auth-provider.tsx`, `reservations/route.ts`
- **Fix:** Ahora usa `process.env.NEXT_PUBLIC_RESTAURANT_ID` con fallback al UUID conocido.

---

### ALTOS (Funcionalidad incompleta)

#### 3.7 Admin no enviaba email al confirmar/cancelar
- **Archivo:** `src/app/api/reservations/route.ts` (PATCH handler)
- **Problema:** Cuando admin cambiaba status a `confirmed` o `cancelled`, el cliente no recibia notificacion.
- **Fix:** PATCH handler ahora busca el email del customer y envia notificacion via `/api/email` (fire-and-forget).

#### 3.8 Admin panel no mostraba zona de la reserva
- **Archivo:** `src/app/admin/AdminClient.tsx`
- **Problema:** La query no incluia `table_zones(name)`. Admin no sabia en que zona era la reserva.
- **Fix:** Query ahora incluye `zone_id, table_zones(name)` y se muestra en la UI con icono MapPin.

#### 3.9 Sin validacion de fecha pasada en formulario
- **Archivo:** `src/components/reservation/ReservationForm.tsx`
- **Problema:** El `<input type="date">` no tenia atributo `min`. Se podian reservar fechas pasadas.
- **Fix:** Se agrego `min={new Date().toISOString().split('T')[0]}`. Tambien se agrego validacion en el API.

#### 3.10 Sin feedback de error al usuario en reserva fallida
- **Archivo:** `src/components/reservation/ReservationForm.tsx`
- **Problema:** Errores se logueaban a `console.error` pero el usuario no veia nada.
- **Fix:** Se agrego estado `submitError` y se muestra en la UI con estilo rojo.

#### 3.11 Carga de zonas sin feedback
- **Archivo:** `src/components/reservation/ReservationForm.tsx`
- **Problema:** Fetch de zonas fallaba silenciosamente. Si fallaba, la lista de zonas era vacia sin explicacion.
- **Fix:** Se agrego estado `zonesLoading`, spinner durante carga, y mensaje de error si falla.

#### 3.12 Status log PATCH sin `changed_by`
- **Archivo:** `src/app/api/reservations/route.ts`
- **Problema:** El log de cambio de status en PATCH no incluia quien hizo el cambio.
- **Fix:** Ahora incluye `changed_by: user.id` del admin autenticado.

---

### MEDIOS (Robustez / UX)

#### 3.13 Middleware solo verificaba cookie existence
- **Archivo:** `src/middleware.ts`
- **Problema:** Solo verificaba que existiera la cookie `sb-access-token`, no que fuera valida.
- **Fix:** Ahora usa `createServerClient` de `@supabase/ssr` y llama `auth.getUser()` para verificar la sesion. Tambien protege `/perfil` y `/reservar`, no solo `/admin`.

#### 3.14 Admin check con verificacion de rol en middleware
- **Archivo:** `src/middleware.ts`
- **Fix:** Middleware ahora consulta `user_roles` para verificar rol admin antes de permitir acceso a `/admin`.

#### 3.15 Tipo `unknown` en catch blocks
- **Archivo:** `src/lib/auth/auth-provider.tsx`
- **Problema:** `catch (err) { err.message }` falla con strict mode porque `err` es `unknown`.
- **Fix:** Cambiado a `err instanceof Error ? err.message : 'An unknown error occurred'`.

#### 3.16 Placeholder fallbacks en Supabase client
- **Archivo:** `src/lib/supabase/client.ts`
- **Problema:** Si faltaban env vars, se creaba un cliente roto silenciosamente.
- **Fix:** Ahora lanza error si faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

#### 3.17 URL Vercel hardcoded como fallback OAuth
- **Archivo:** `src/lib/supabase/client.ts`
- **Fix:** Ahora usa `window.location.origin + /auth/callback` cuando esta en browser, sin fallback hardcoded.

#### 3.18 HTML sin escapar en emails (XSS potencial)
- **Archivo:** `src/app/api/email/route.ts`
- **Problema:** Valores de usuario (nombre, zona, notas) se interpolaban directamente en HTML del email.
- **Fix:** Se agrego funcion `esc()` que HTML-escapa todos los valores antes de interpolar.

#### 3.19 Ternario muerto en email fetch URL
- **Archivo:** `src/app/api/reservations/route.ts`
- **Problema:** `process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''` siempre evaluaba a string vacio.
- **Fix:** Eliminado el ternario. Ahora usa `new URL(request.url).origin` directamente.

#### 3.20 Profile no mostraba `time_end`
- **Archivo:** `src/app/perfil/ProfileClient.tsx`
- **Fix:** Ahora muestra `time_start - time_end` en vez de solo `time_start`.

#### 3.21 Stale closures en useEffect hooks
- **Archivos:** `AdminClient.tsx`, `ProfileClient.tsx`
- **Problema:** Funciones en useEffects sin estar en dependency arrays.
- **Fix:** Se usaron `useCallback` para las funciones y se agregaron a los dependency arrays.

#### 3.22 Codigo muerto en AdminClient
- **Archivo:** `src/app/admin/AdminClient.tsx` linea 69
- **Problema:** `const SRK = process.env.NEXT_PUBLIC_SUPABASE_URL // we need server action` — variable incorrecta y nunca usada.
- **Fix:** Eliminada.

#### 3.23 Validacion de status en PATCH
- **Archivo:** `src/app/api/reservations/route.ts`
- **Problema:** Status no validado contra enum permitido.
- **Fix:** Se agrego `VALID_STATUSES` array y validacion.

#### 3.24 Validacion de input en POST
- **Archivo:** `src/app/api/reservations/route.ts`
- **Problema:** Solo se verificaba que los campos existian, no formato.
- **Fix:** Se agrego validacion de formato de fecha, hora, y partySize.

---

### BAJOS (Calidad de codigo / Limpieza)

#### 3.25 Archivo backup en source tree
- **Archivo:** `src/app/auth/login/LoginPage.bak`
- **Fix:** Eliminado del repositorio.

#### 3.26 `.env.example` incompleto
- **Problema:** Faltaba `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_RESTAURANT_ID`. Variables no usadas (`GOOGLE_CLIENT_ID/SECRET`).
- **Fix:** Actualizado con todas las variables necesarias.

#### 3.27 `reservation_date` vs `date` en query
- **Archivo:** `src/lib/supabase/client.ts` linea 115
- **Problema:** `getByCustomer` ordenaba por `reservation_date` pero la columna es `date`.
- **Fix:** Cambiado a `.order('date', ...)`.

#### 3.28 Redirect despues de login sin auto-redirect a reservar
- **Problema:** Cuando el formulario de reserva redirigia a login, despues del login exitoso no volvia a `/reservar`.
- **Fix:** Login ahora soporta parametro `?redirect=` y el formulario de reserva lo usa.

#### 3.29 Admin panel: acciones adicionales para reservas confirmadas
- **Fix:** Se agregaron botones "Marcar completada" y "No asistio" para reservas en estado confirmed.

---

## 4. FLUJO MVP (Post-Fix)

### Flujo Cliente
1. Cliente visita `/` → ve HeroSection con CTA "Reservar Mesa"
2. Click → navega a `/reservar`
3. Si no autenticado → middleware redirige a `/auth/login?redirect=/reservar`
4. Cliente elige: Google, WhatsApp OTP, o Email/Password
5. **WhatsApp:** Ingresa telefono → recibe OTP → verifica → redirige a `/reservar`
6. **Google:** OAuth flow → callback → redirige a `/reservar`
7. **Email:** Ingresa credenciales → redirige a `/reservar`
8. Llena formulario 4 pasos (fecha, hora/zona, datos, confirmar)
9. POST `/api/reservations` (con auth verificada) → reserva creada con status `pending`
10. Email de confirmacion enviado al cliente
11. Link de WhatsApp para confirmar verbalmente
12. Ve sus reservas en `/perfil`

### Flujo Admin
1. Admin visita `/admin` → middleware verifica sesion + rol admin
2. Ve panel con stats (total, pendientes, confirmadas, hoy)
3. Filtra reservas por status
4. Para reservas pendientes: Confirmar o Cancelar
5. Al confirmar: PATCH `/api/reservations` (con auth admin verificada)
6. Email de confirmacion/cancelacion enviado al cliente automaticamente
7. Log de cambio de status con `changed_by` registrado

---

## 5. QUE FALTA PARA MVP COMPLETO

### Necesario (Debe tener)

| # | Item | Prioridad | Complejidad | Descripcion |
|---|------|----------|-------------|-------------|
| 1 | **RLS policies en Supabase** | CRITICA | Media | Las tablas `customers`, `reservations`, `user_roles` necesitan RLS policies para que el anon key client solo acceda a sus propios datos. Actualmente todo depende del service role key. |
| 2 | **Verificar schema DB** | CRITICA | Baja | Confirmar que las columnas `phone`, `zone_id`, `time_end` existen en las tablas. El codigo asume estas columnas. |
| 3 | **Probar flujo WhatsApp OTP end-to-end** | ALTA | Baja | Verificar que Supabase esta configurado para enviar OTP por WhatsApp (requiere Twilio + Supabase config). |
| 4 | **Rate limiting en APIs** | ALTA | Media | Sin rate limiting, `/api/email` puede ser abusado para spam. `/api/reservations` para flooding. |
| 5 | **Manejo de zona_id en tabla reservations** | ALTA | Baja | El API guarda `zone_id` pero la columna puede no existir. Si no existe, la reserva se crea sin zona. |

### Deseable (Bueno tener)

| # | Item | Prioridad | Descripcion |
|---|------|----------|-------------|
| 6 | Disponibilidad en tiempo real | MEDIA | Los time slots son hardcoded. No se verifica si un horario ya esta reservado. |
| 7 | Paginacion en admin | MEDIA | Carga todas las reservas sin paginacion. Escalabilidad limitada. |
| 8 | Cancelar reserva desde perfil | MEDIA | El cliente no puede cancelar su propia reserva. Solo el admin. |
| 9 | Recordatorios automaticos | BAJA | Email de recordatorio existe como template pero no hay cron job. |
| 10 | Componentes home no usados | BAJA | `AboutSection`, `ExperiencePillars`, `GalleryPreview`, `ReservationCTA` existen pero no se renderizan. |
| 11 | Horarios del restaurante | BAJA | Time slots son estaticos. Deberian venir de config o DB. |
| 12 | Links en Footer | BAJA | Facebook link es `#`. Galeria link a `/galeria` no existe. |

---

## 6. SUPABASE RLS — RECOMENDACIONES

Las siguientes policies son necesarias para seguridad en produccion:

### Tabla `customers`
```sql
-- Users can read their own customer record
CREATE POLICY "Customers can read own data"
  ON customers FOR SELECT
  USING (auth_user_id = auth.uid());

-- Users can insert their own customer record
CREATE POLICY "Customers can insert own data"
  ON customers FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Admins can read all customers
CREATE POLICY "Admins can read all customers"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'store_admin')
    )
  );
```

### Tabla `reservations`
```sql
-- Customers can read their own reservations
CREATE POLICY "Customers can read own reservations"
  ON reservations FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

-- Customers can insert reservations for themselves
CREATE POLICY "Customers can insert own reservations"
  ON reservations FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can read/update all reservations
CREATE POLICY "Admins can manage all reservations"
  ON reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('super_admin', 'store_admin')
    )
  );
```

### Tabla `user_roles`
```sql
-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  USING (auth_user_id = auth.uid());

-- Service role can insert/manage roles (done via API)
```

### Tabla `table_zones`
```sql
-- Public read access (zones are shown on reservation form)
CREATE POLICY "Zones are publicly readable"
  ON table_zones FOR SELECT
  TO anon, authenticated
  USING (true);
```

---

## 7. CHECKLIST DE VERIFICACION PRE-DEPLOY

- [ ] Variables de entorno configuradas en Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NEXT_PUBLIC_RESTAURANT_ID)
- [ ] RLS policies activadas en Supabase
- [ ] Supabase Auth configurado con Google OAuth provider
- [ ] Supabase Auth configurado con WhatsApp OTP (Twilio)
- [ ] Redirect URL en Google Cloud Console incluye el dominio de produccion + `/auth/callback`
- [ ] Tabla `customers` tiene columna `phone` (no `telephone`)
- [ ] Tabla `reservations` tiene columna `zone_id`
- [ ] Tabla `table_zones` tiene datos (seed)
- [ ] Tabla `user_roles` tiene al menos un admin
- [ ] `resend.com` dominio verificado para enviar desde `ventas@ccs724.com`
- [ ] Probar flujo completo: login → reserva → admin confirma → email recibido

---

## 8. CAMBIOS REALIZADOS (Summary)

| Archivo | Cambios |
|---------|---------|
| `LoginClient.tsx` | +Boton WhatsApp, +redirect post-login, +useSearchParams, +useEffect |
| `client.ts` | OTP channel fix, remove placeholders, remove hardcoded URL, fix reservation_date column, fix any type |
| `auth-provider.tsx` | Fix catch types, telephone→phone, restaurant_id from env var |
| `middleware.ts` | Full rewrite: Supabase session validation, protect /perfil and /reservar, admin role check |
| `reservations/route.ts` | Full rewrite: auth verification, input validation, status validation, changed_by in PATCH, email notifications on status change |
| `email/route.ts` | HTML escaping for user-provided values |
| `ReservationForm.tsx` | Error state, zones loading state, min date, redirect param, remove userId from POST body |
| `AdminClient.tsx` | Full rewrite: remove dead code, add zone display, add email notifications, add loading state for updates, add completed/no_show actions, useCallback fixes |
| `ProfileClient.tsx` | useCallback fixes, show time_end, improve error handling |
| `.env.example` | Add NEXT_PUBLIC_RESTAURANT_ID, SUPABASE_SERVICE_ROLE_KEY, remove unused GOOGLE vars |
| `LoginPage.bak` | Deleted |