# AGENTS.md — Attick & Keller POS Dashboard

Sistema de gestion para Attick & Keller. Next.js 19 + React 19 + Tailwind 4 + Supabase + Vercel.

## Startup Workflow

Antes de escribir codigo:

1. `pwd` — Confirmar directorio: `/mnt/f/attick-keller/web`
2. Leer este archivo completo
3. Leer `progress.md` para contexto de sesion anterior
4. Leer `feature_list.json` para estado de features
5. Ejecutar `./init.sh` para verificar entorno
6. `git log --oneline -5` para ver cambios recientes

Si la verificacion base falla, reparar ANTES de agregar nuevo scope.

## Working Rules

- **Una feature a la tiempo**: Elegir exactamente UNA feature de `feature_list.json`. One feature at a time — never work on multiple features simultaneously.
- **Verificacion requerida**: No declarar "done" sin correr `npx tsc --noEmit` y verificar en browser
- **Actualizar artefactos**: Antes de cerrar sesion, actualizar `progress.md` y `feature_list.json`
- **Stay in scope**: No modificar archivos no relacionados con la feature activa
- **Dejar estado limpio**: La proxima sesion debe poder correr `./init.sh` inmediatamente
- **Formato moneda**: Siempre COP con `$` y puntos para miles (ej: $1.250.000)
- **Sin emojis en UI**: Usar iconos Phosphor, nunca emojis nativos
- **Colores**: Solo los definidos en `src/lib/utils/constants.ts` y CSS vars, nunca `stone-*` genericos
- **Branch**: `master` es la rama de deployment (Vercel). Commits directos a master.
- **Deploy**: `npx vercel --prod --yes --token $VERCEL_TOKEN`

## Required Artifacts

- `feature_list.json` — Estado de features (fuente de verdad)
- `progress.md` — Log de continuidad entre sesiones
- `init.sh` — Verificacion de entorno idempotente
- `session-handoff.md` — Handoff explicito para sesiones largas

## Definition of Done

Una feature esta "done" SOLO cuando TODOS estos son true:

- [ ] Comportamiento objetivo implementado
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Build exitoso (`next build`)
- [ ] Verificado en browser (no solo compilacion)
- [ ] Evidencia registrada en `feature_list.json` o `progress.md`
- [ ] Repo sigue siendo restarteable desde `./init.sh`

## End of Session

Antes de cerrar una sesion:

1. Actualizar `progress.md` con estado actual
2. Actualizar `feature_list.json` con nuevo status de features
3. Registrar blockers o riesgos no resueltos
4. Commit con mensaje descriptivo
5. Dejar repo limpio para que `./init.sh` corra en la proxima sesion

## Verification Commands

```bash
# Verificacion completa (recomendada)
npx tsc --noEmit && npm run build

# Verificacion rapida (type-check solo)
npx tsc --noEmit

# Deploy a produccion
npx vercel --prod --yes --token $VERCEL_TOKEN
```

Checks requeridos:
- `npx tsc --noEmit` — TypeScript sin errores
- `npm run build` — Next.js build exitoso
- Verificacion manual en browser: `https://web-rosy-nine-64.vercel.app/admin`

## Escalation

Si encuentras:
- **Decisiones de arquitectura**: Consultar `specs/` o preguntar a Alejandro
- **Requisitos poco claros**: Revisar spec correspondiente en `specs/`, sino preguntar
- **Tests fallando repetidamente**: Actualizar progress, marcar para revision humana
- **Ambiguedad de scope**: Re-leer `feature_list.json` para definition of done
- **Token de Vercel expirado**: Pedir a Alejandro uno nuevo

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/admin/pos-dashboard/     # API routes (Supabase queries)
│   │   ├── admin/                       # Admin pages
│   │   └── ...
│   ├── components/admin/pos-dashboard/  # Dashboard components
│   ├── lib/
│   │   ├── hooks/usePOSDashboard.ts     # Main data hook
│   │   └── utils/                       # Auth, constants, helpers
│   └── middleware.ts                     # Auth middleware
├── specs/                               # Feature specifications
├── AGENTS.md                            # This file
├── feature_list.json                    # Feature state tracker
├── progress.md                          # Session continuity log
├── init.sh                              # Verification script
└── session-handoff.md                   # Session handoff
```

## Key Conventions

- **Supabase**: Service role key para queries admin, anon key para cliente. Tablas `pos_*` para datos POS.
- **API Pattern**: `GET /api/admin/pos-dashboard?from=X&to=Y&category=Z&zone=W`
- **Component Pattern**: `POSDashboardPanel` → components individuales con props
- **Dark Mode**: CSS vars con `var(--bg-card)`, `var(--text-primary)`, etc. ThemeProvider con toggle Sun/Moon
- **Deployment**: Vercel desde `master`. Site: `web-rosy-nine-64.vercel.app`

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->