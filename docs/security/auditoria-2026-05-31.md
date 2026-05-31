# Análisis de Riesgo — Correcciones de Seguridad A&K

**Fecha:** 31 de mayo de 2026
**Auditoría original:** 4 críticos, 4 altos, 7 medios

---

## Cambios Aplicados (ya en código)

### 1. `src/app/api/admin/nomina-import/route.ts`
**Problema:** Token hardcodeado `'nomina-import-ak-2026'` — predecible, visible en cualquier copia del código.
**Fix:** `const IMPORT_TOKEN = process.env.NOMINA_IMPORT_TOKEN || ''`
**Estado:** ✅ Aplicado. Falta agregar `NOMINA_IMPORT_TOKEN` a `.env.local`.

### 2. `src/app/api/admin/nomina-ddl/route.ts`
**Problema:** `if (token !== '***')` — placeholder débil, si no se configura queda `'***'` como token válido.
**Fix:** `const validToken = process.env.NOMINA_IMPORT_TOKEN; if (!validToken || token !== validToken)`
**Estado:** ✅ Aplicado. Comparte variable con nomina-import. Falta agregar a `.env.local`.

### 3. `next.config.ts`
**Problema:** Archivo vacío — sin headers de seguridad HTTP.
**Fix:** Agregados 5 headers de seguridad:
- `X-Frame-Options: DENY` — previene clickjacking
- `X-Content-Type-Options: nosniff` — previene MIME-sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — controla leaking de referrer
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — bloquea APIs del navegador
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — fuerza HTTPS por 2 años
**Estado:** ✅ Aplicado.

### 4. `package.json` — Next.js
**Problema:** Next.js 16.2.4 con 12 vulnerabilidades (4 HIGH: SSRF CVSS 8.6, bypass middleware CVSS 8.1, 2 DoS).
**Fix:** `npm install next@16.2.6` → 4 vulnerabilidades moderadas restantes (transitivas, sin HIGH).
**Estado:** ✅ Aplicado.

---

## Cambios Pendientes (requieren autorización)

### 5. Generar `NOMINA_IMPORT_TOKEN`
**Qué hace:** `openssl rand -hex 32` genera token aleatorio de 64 caracteres.
**Dónde:** Agregar `NOMINA_IMPORT_TOKEN=<token>` a `.env.local`.
**Impacto:** Ambos endpoints (nomina-import y nomina-ddl) lo usarán. Sin él, los endpoints quedan con `token !== ''` que nunca matchea (seguro pero inutilizable).
**Riesgo de NO hacerlo:** Medio — los endpoints no funcionan hasta que se configure.

### 6. Eliminar `.env.remote`
**Qué hace:** `rm /mnt/f/attick-keller/web/.env.remote`
**Contenido expuesto:** SMTP password, Resend API key, Supabase service_role key, Vercel token, encryption key, Firebase service account, Bold/Coinbase API keys.
**Riesgo de NO hacerlo:** Crítico — si alguien accede al filesystem (backup, malware, error humano), todas las credenciales están en texto plano.
**Mitigación:** `.gitignore` ya lo protege de git, pero no del filesystem.

### 7. Agregar `NOMINA_IMPORT_TOKEN` a variables de Vercel
**Qué hace:** Configurar en Vercel Dashboard → Settings → Environment Variables.
**Impacto:** Sin esto, los endpoints fallan en producción (no leen `.env.local` local).
**Riesgo de NO hacerlo:** Alto — nomina-import y nomina-ddl dejan de funcionar en prod.

---

## Riesgos NO Mitigados (quedan pendientes)

| # | Riesgo | Severidad | Esfuerzo |
|---|--------|-----------|----------|
| R1 | Service role key en middleware (sobre-privilegiado) | Media | Medio — refactor grande |
| R2 | RLS nómina sin filtro `restaurant_id` | Alta | Bajo — SQL migration |
| R3 | Sin políticas INSERT/UPDATE/DELETE en RLS nómina | Media | Bajo — SQL migration |
| R4 | Arrays de roles duplicados (middleware vs admin-auth) | Baja | Bajo — centralizar en constants.ts |
| R5 | `.single()` en middleware puede fallar con multi-rol | Media | Bajo — cambiar a `.maybeSingle()` |

---

## Análisis de Riesgo Residual

### ¿Qué podría dañar el proyecto?

1. **Si `.env.remote` se filtra** (backup, malware, screenshot): acceso total a BD Supabase, email, Firebase, pagos Bold/Coinbase. Impacto: **catastrófico**.

2. **Si alguien obtiene el `NOMINA_IMPORT_TOKEN`**: puede modificar datos de nómina (staff, detalle, HE, novedades, provisiones, propinas). Impacto: **alto** pero limitado a datos de nómina, no a BD completa.

3. **Si un endpoint admin queda desprotegido**: el service_role key da acceso total a la BD. Las rutas están bien protegidas hoy (`getAdminUser`), pero el diseño de "todo o nada" con service_role implica que un solo bug de auth expone todo.

4. **Si el proyecto escala a múltiples restaurants**: un usuario del restaurant A puede leer nómina del restaurant B (RLS `USING (true)`). Impacto: **medio** hoy (solo hay 1 restaurant), **alto** si se expande.

### ¿Qué NO es un riesgo hoy?

- El código ya está en git (repo privado) — el riesgo viene de acceso no autorizado al filesystem, no de git.
- Las rutas admin tienen auth correcta (`getAdminUser`/`getStaffUser`).
- Los headers de seguridad ya están en `next.config.ts`.

---

## Recomendación de Ejecución

1. **AHORA**: Autorizar generación de token + eliminar `.env.remote` + configurar Vercel env.
2. **ESTA SEMANA**: Corregir RLS nómina (migración SQL para agregar `restaurant_id`).
3. **PRÓXIMO SPRINT**: Refactorizar middleware (service_role → anon key + RLS).