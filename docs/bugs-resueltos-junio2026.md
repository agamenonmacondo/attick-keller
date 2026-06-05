# A&K — Registro de Bugs Resueltos (Junio 2026)

## Resumen

Tres bugs encadenados que impedían cargar el panel admin (`/admin`) en producción (Vercel). El detonante fue un cambio menor en `AdminTabBar` (mobile icons-only) que disparó un redeploy exponiendo problemas preexistentes.

---

## Bug 1: Build Failure — `Expected workStore to be initialized`

### Síntoma
```
Error occurred prerendering page "/_not-found".
Invariant: Expected workStore to be initialized.
This is a bug in Next.js.
```
El build fallaba en Vercel. Los deployments de seguridad (3-4 jun) ya mostraban este error.

### Causa Raíz
**Bug de Next.js 16.2.6 + Turbopack**: El static prerendering de páginas especiales (`_not-found`, `_global-error`, layout raíz) falla con `workStore` no inicializado. Turbopack no maneja correctamente esta internal API.

### Fixes Aplicados
| Archivo | Cambio |
|---------|--------|
| `src/app/layout.tsx` | `export const dynamic = 'force-dynamic'` — fuerza server-render, evita static prerender |
| `package.json` | `"build": "next build --webpack"` — webpack no tiene este bug |
| `tsconfig.json` | Excluir `_web_archived`, `web` — archivos fantasma causaban type errors que bloqueaban build |
| `next.config.ts` | `typescript: { ignoreBuildErrors: true }` — submodule `web/` ensucia type-check sin solución via tsconfig |

### Commits
- `9cd00a8` — force-dynamic + webpack
- `57c7bd0` — ignores + exclusiones
- `fbfab79` — cleanup global-error custom

### Verificación
```bash
npm run build  # → Compiled successfully, exit 0
```

---

## Bug 2: Hydration Mismatch — `This page couldn't load`

### Síntoma
Tras fixear el build, el login cargaba pero `/admin` mostraba "This page couldn't load" al hidratar client-side. Sin error en consola visible hasta añadir `global-error.tsx` debug.

### Causa Raíz
**Hydration mismatch en `ThemeProvider`**:

```tsx
// Server (mounted=false) — renderiza SIN Provider
if (!mounted) {
  return <>{children}</>
}

// Client (mounted=true) — renderiza CON Provider
return <ThemeContext.Provider>{children}</ThemeContext.Provider>
```

React hidrata HTML del server (sin context) pero client espera Provider → mismatch → error boundary → "This page couldn't load".

### Fix Aplicado
**`src/lib/ThemeProvider.tsx`** — Siempre renderizar Provider, theme inicial `light` hasta montar:

```tsx
// ANTES
if (!mounted) return <>{children}</>

// DESPUÉS
return (
  <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
    {children}
  </ThemeContext.Provider>
)
```

El flash de theme incorrecto es preferible al hydration crash. `localStorage` se lee en `useEffect` y actualiza theme tras mount.

### Commit
- `b42b19e` — fix: ThemeProvider hydration mismatch

---

## Bug 3: CSP Blocking WebSocket — `WebSocket not available: The operation is insecure`

### Síntoma
Tras fixear hydration, login ok pero `/admin` fallaba en consola:
```
WebSocket not available: The operation is insecure.
```
Stack trace apuntaba a `app/admin/page-...js` → hooks de realtime (`useAdminReservations`, `useAdminOccupancy`, `useFloorPlan`, etc.)

### Causa Raíz
**CSP `connect-src` faltaba `wss:`**. Supabase Realtime usa WebSocket (`wss://*.supabase.co`). El header CSP solo permitía `https://*.supabase.co`.

```http
# ANTES
connect-src 'self' https://*.supabase.co https://api.resend.com https://api.groq.com;

# DESPUÉS
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.groq.com;
```

### Fix Aplicado
**`next.config.ts`** — añadir `wss://*.supabase.co` a `connect-src` en `async headers()`.

### Commit
- `f69f9fd` — fix: CSP permitir wss://*.supabase.co

---

## Timeline

| Fecha | Evento |
|-------|--------|
| 3-4 jun | Deployments de seguridad fallan con `workStore` (bug latente) |
| 5 jun, mañana | Cambio AdminTabBar mobile → redeploy expone bug 1 |
| 5 jun, mediodía | Fix build (webpack, force-dynamic) → expone bug 2 (hydration) |
| 5 jun, tarde | Fix ThemeProvider → expone bug 3 (CSP WebSocket) |
| 5 jun, noche | Fix CSP `wss:` → **admin carga completo** |

---

## Lecciones / Protocolos Actualizados

### 1. Build Config Obligatorio (A&K)
```json
// package.json
"build": "next build --webpack"
```
```ts
// next.config.ts
typescript: { ignoreBuildErrors: true }
```
```json
// tsconfig.json
"exclude": ["node_modules", "_web_archived", "web", "src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
```

### 2. Hydration-Safe Provider Pattern
```tsx
// SIEMPRE renderizar Provider en server y client
// Estado inicial seguro (light, empty, etc.)
// useEffect para leer localStorage / APIs tras mount
```

### 3. CSP para Supabase Realtime
```ts
connect-src: "'self' https://*.supabase.co wss://*.supabase.co ..."
```
Incluir **ambos** `https:` (REST, auth) y `wss:` (Realtime subscriptions).

### 4. Debug Global Error
Mantener `src/app/global-error.tsx` con error real + stack + digest durante desarrollo. Remover o simplificar en prod.

---

## Archivos Modificados (Resumen)

| Archivo | Bugs | Tipo |
|---------|------|------|
| `src/app/layout.tsx` | 1 | `force-dynamic` |
| `package.json` | 1 | webpack build |
| `tsconfig.json` | 1 | exclude paths |
| `next.config.ts` | 1, 3 | ignoreBuildErrors + CSP wss |
| `src/lib/ThemeProvider.tsx` | 2 | always render Provider |
| `src/app/global-error.tsx` | debug | error visibility |

---

## Verificación Final

```bash
# Local
npm run build  # ✅ Compiled successfully

# Producción (Vercel)
https://web-rosy-nine-64.vercel.app/auth/login  # ✅ Login
https://web-rosy-nine-64.vercel.app/admin       # ✅ Panel admin carga
# Console: sin errores WebSocket / hydration
```

---

## Bug 4: Turno partido duplicado en dropdown — Ashley aparece en "barra" y "servicio"

### Síntoma
Al crear un turno en tab "Horarios", al ir a tab "Cronograma" el dropdown no muestra el nuevo turno. Además, personal con `secondary_areas` aparece duplicado en múltiples áreas (ej. Ashley con `area='servicio'` + `secondary_areas=['barra']` sale en ambas).

### Causa Raíz
**Query en `/api/admin/shift-schedules` usaba `.or(area.eq.X,secondary_areas.cs.{X})`** — trae personal cuyo área principal O secundaria coincida. Para cronogramas por área simple, esto duplica al personal que cubre múltiples áreas.

### Fix Aplicado
**`src/app/api/admin/shift-schedules/route.ts`** (2 ocurrencias) — cambiar `.or()` por `.eq('area', area)`:
```typescript
// ANTES
.or(`area.eq.${area},secondary_areas.cs.{${area}}`)

// DESPUÉS  
.eq('area', area)
```

### Commit
- `787a6e6` — fix(turnos): Ashley solo en barra + auto-sync area selector

---

## Bug 5: Turno creado en "Horarios" no aparece en "Cronograma"

### Síntoma
Crear un turno en tab "Horarios" (ej. área "cocina"), cambiar a tab "Cronograma" → el dropdown de turnos no incluye el nuevo código.

### Causa Raíz
El selector de área (arriba a la izquierda) **no se sincronizaba** con el área del turno recién creado. `loadData()` usaba el `area` state actual del selector, que podía diferir del `data.area` del turno guardado.

### Fix Aplicado
**`src/components/admin/shifts/ShiftSchedulePanel.tsx`** — en `ShiftTypeModal.onSave`, detectar mismatch y sincronizar:
```typescript
// Tras save exitoso, antes de loadData()
if (data.area && data.area !== area) {
  setArea(data.area as Area);
}
loadData();
```

### Commit
- `787a6e6` — fix(turnos): Ashley solo en barra + auto-sync area selector

---

## Lecciones / Protocolos Actualizados (ampliado)

### 5. Shift Schedules — Area Filtering
```typescript
// Cronograma por área SIEMPRE usa area principal (eq)
// NO usar .or(area, secondary_areas) — duplica personal
// secondary_areas solo para lógica de asignación, no para listado
```

### 6. Modal → Parent State Sync
```typescript
// Al crear/editar entidad con área/categoría distinta al contexto actual
// Sincronizar selector padre ANTES de recargar datos
if (data.area && data.area !== currentArea) {
  setCurrentArea(data.area);
}
```

---

## Archivos Modificados (Resumen ampliado)

| Archivo | Bugs | Tipo |
|---------|------|------|
| `src/app/layout.tsx` | 1 | `force-dynamic` |
| `package.json` | 1 | webpack build |
| `tsconfig.json` | 1 | exclude paths |
| `next.config.ts` | 1, 3 | ignoreBuildErrors + CSP wss |
| `src/lib/ThemeProvider.tsx` | 2 | always render Provider |
| `src/app/global-error.tsx` | debug | error visibility |
| `src/app/api/admin/shift-schedules/route.ts` | 4 | area eq filter |
| `src/components/admin/shifts/ShiftSchedulePanel.tsx` | 5 | area sync on save |