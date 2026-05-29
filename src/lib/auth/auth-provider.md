# auth-provider (AuthProvider + useAuth)

## Proposito
Contexto React de autenticacion para toda la app. Provee estado de usuario, roles (isAdmin, isHost, isEmployee, adminRole), y metodos de signIn/signUp/signOut. Es el single source of truth para saber si un usuario esta autenticado y que permisos tiene. Se consume via `useAuth()` hook.

## Datos
- **Supabase Auth (client-side)**:
  - `getSession()` — Obtiene sesion inicial al montar
  - `onAuthStateChange()` — Escucha cambios de sesion (login, logout, token refresh)
  - `signInWithPassword()` — Login con email/password
  - `signUp()` — Registro con email/password
  - `signInWithOAuth({ provider: 'google' })` — Login con Google
  - `signOut()` — Cierre de sesion
- **GET /api/auth/role** — Obtiene el rol del usuario autenticado (store_admin, super_admin, host, lider_area, colaborador, reservante)
- **POST /api/auth** — Auto-confirma usuarios nuevos (bypass de email verification)
- **Tablas indirectas**: auth.users (Supabase Auth), user_roles (via /api/auth/role)

## Dependencias
- **Lo usan**: AdminShell, cualquier pagina/componente que necesite saber si el user esta autenticado y su rol. Middleware (src/middleware.ts) usa logica similar pero server-side.
- **Usa a**:
  - createBrowserClient de @supabase/ssr — cliente Supabase browser-side
  - /api/auth/role — obtiene rol del servidor
  - /api/auth — auto-confirmacion de usuarios

## Pitfalls
- **Auto-confirm hack en signUpWithEmail**: Despues de registrar, si no hay sesion inmediata, intenta auto-confirmar via POST /api/auth. Si falla, espera 2 segundos y reintenta. Este flujo es fragil — si el servidor esta lento, el segundo intento podria fallar tambien. Ademas, el usuario podria quedar en estado "registrado pero sin sesion".
- **Redireccion de hash en onAuthStateChange**: Limpia `#access_token` del URL via `window.history.replaceState`. Esto es para OAuth callback, pero si hay otros hash fragments en la URL, se pierden.
- **Roles hardcodeados**: La clasificacion de roles (isAdmin = store_admin || super_admin, isEmployee = lider_area || colaborador || reservante) esta hardcodeada. Agregar un rol nuevo requiere actualizar este archivo Y el middleware Y la API de staff.
- **fetchRole en cada auth state change**: Cada vez que Supabase detecta un cambio de auth (incluyendo token refresh), se llama fetchRole(). Esto puede generar muchas requests a /api/auth/role. No hay cache ni debounce.
- **signOut redirige con window.location.href = '/'**: Forza una navegacion completa, descartando cualquier estado de React. Funciona, pero no es la forma mas limpia con Next.js App Router.
- **createBrowserClient dentro del componente**: Se crea una nueva instancia de Supabase client en cada render del AuthProvider (dentro de la funcion del componente, fuera de useEffect/useMemo). En React 19 con Strict Mode, esto podria crear dos instancias en desarrollo.
- **clearRole no resetea roleLoading**: El callback clearRole si setea `setRoleLoading(false)`, lo cual es correcto. Pero si fetchRole falla (catch), tambien setea los valores en false sin distinguir "no tiene rol" de "error de red".

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: agregar rol reservante al enum, API, formulario y middleware |
| 2026-05-28 | Ninja | feat: panel colaborador - mi-turno con horario, checkin/out, novedad 24hrs, horas trabajadas |
| 2026-05-04 | Ninja | Add Google avatar to profile and redirect to home on sign out |
| 2026-05-04 | Ninja | Fix auth redirect loop after Google OAuth login |
| 2026-04-20 | Ninja | fix: auto-create customer record on signup, retry auto-confirm |
| 2026-04-20 | Ninja | fix: signup auto-confirm then auto-login after email confirmation bypass |
| 2026-04-19 | Ninja | fix: signup auto-confirm, redesigned photo CTA editorial style, auth back link |
| 2026-04-19 | Ninja | rebuild: complete site rewrite - auth, menu, reservations, admin - build passing |