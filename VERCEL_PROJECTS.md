# A&K — Arquitectura de Entornos: Staging + Producción

## Resumen

Separación completa entre **staging** (pruebas/QA) y **producción** (live). Producción **nunca** recibe código sin validación previa en staging.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        GITHUB REPO                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ feature/*   │→ │  staging    │→ │   master    │             │
│  │ (dev)       │  │  (QA)       │  │  (prod)     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Vercel Preview  │ │ Vercel Project  │ │ Vercel Project  │
│ Deployments     │ │ attick-keller-  │ │ web             │
│ (por feature)   │ │ staging         │ │ (producción)    │
│                 │ │                 │ │                 │
│ URL temporal    │ │ staging.        │ │ web-rosy-nine-  │
│ por PR/branch   │ │ attickkeller.com│ │ 64.vercel.app   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Proyectos Vercel

| Entorno | Proyecto Vercel | Branch | URL | Env Vars |
|---------|-----------------|--------|-----|----------|
| **Feature/Dev** | `web` (preview) | `feature/*`, `fix/*` | `web-git-<branch>-...vercel.app` | Compartidas con prod |
| **Staging/QA** | `attick-keller-staging` | `staging` | `https://staging.attickkeller.com` | **Propias (aisladas)** |
| **Producción** | `web` | `master` | `https://web-rosy-nine-64.vercel.app` | Produccion |

---

## Flujo de Trabajo Obrigatorio

### 1. Desarrollo (Feature Branch)
```bash
git checkout -b fix/mi-cambio
# commits...
git push origin fix/mi-cambio
# → Vercel Preview Deployment automático
# → Probar en URL temporal
```

### 2. Staging / QA (Rama `staging`)
```bash
git checkout staging
git merge fix/mi-cambio
git push origin staging
# → Build en proyecto attick-keller-staging
# → Disponible en https://staging.attickkeller.com
# → QA completo: mobile, desktop, flujos críticos, datos reales
```

### 3. Producción (Solo tras staging OK)
```bash
git checkout master
git merge staging
git push origin master
# → Build en proyecto web (prod)
# → Deploy a https://web-rosy-nine-64.vercel.app
```

> **REGLA:** `master` **nunca** recibe push directo. Solo merge desde `staging` tras validación.

---

## Environment Variables — Separación Estricta

### Proyecto `web` (Producción)
| Variable | Target | Valor |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | production, preview | Prod Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production, preview | Prod Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | production, preview | Prod Service Role |
| `GROQ_API_KEY` | production, preview, development | Prod Groq Key |
| `NEXT_PUBLIC_APP_URL` | production | `https://web-rosy-nine-64.vercel.app` |
| ... resto vars prod | ... | ... |

### Proyecto `attick-keller-staging` (Staging)
| Variable | Target | Valor |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | production, preview | **Staging Supabase URL** (proyecto distinto recomendado) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production, preview | Staging Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | production, preview | Staging Service Role |
| `GROQ_API_KEY` | production, preview, development | **Staging Groq Key** (o misma con cuota separada) |
| `NEXT_PUBLIC_APP_URL` | production | `https://staging.attickkeller.com` |
| ... resto vars staging | ... | ... |

> **Por qué separadas:** Evita borrar/modificar datos de producción desde staging. Permite testing de migraciones, webhooks, emails reales sin afectar usuarios reales.

---

## Supabase — Recomendación: Proyecto Separado

```
Production Supabase Project:     pbllaipsdfypelnwrvpy (attick-keller-prod)
Staging Supabase Project:        <nuevo proyecto>     (attick-keller-staging)
```

**Ventajas:**
- Datos 100% aislados
- Migraciones probadas en staging antes de prod
- RLS policies testeadas con datos reales
- Webhooks/edge functions sin ruido

**Setup staging Supabase:**
1. Nuevo proyecto en Supabase Dashboard
2. Ejecutar migraciones (mismo schema)
3. Configurar RLS igual que prod
4. Copiar keys a Vercel staging env vars

---

## Dominios

| Entorno | Dominio | SSL | Configuración |
|---------|---------|-----|---------------|
| Producción | `web-rosy-nine-64.vercel.app` (alias: `attickkeller.com`?) | Auto | Vercel dashboard → web → Domains |
| Staging | `staging.attickkeller.com` | Auto | Vercel dashboard → attick-keller-staging → Domains |

---

## Verificación por Entorno

### Staging Checklist (antes de merge a master)
- [ ] Build exitoso en `attick-keller-staging`
- [ ] Login funciona (admin, host, empleado)
- [ ] Panel admin carga completo (tabs, datos, realtime)
- [ ] Mobile responsive (AdminTabBar, formularios, tablas)
- [ ] Flujos críticos: reserva, check-in, cierre, nómina, informes
- [ ] Webhooks (Resend, POS sync) funcionan en staging
- [ ] No errores en consola (WebSocket, hydration, CSP)
- [ ] Performance aceptable (<3s FCP)

### Producción Checklist (post-merge)
- [ ] Build exitoso en `web`
- [ ] Deploy verificado en `web-rosy-nine-64.vercel.app`
- [ ] Smoke test rápido: login → admin → 1 tab
- [ ] Monitoreo 10 min post-deploy (logs Vercel)

---

## Comandos Útiles

```bash
# Ver estado ramas
git branch -a

# Preview URL de feature branch actual
git push origin HEAD  # → ver URL en GitHub Actions / Vercel CLI

# Deploy manual a staging (si auto falla)
git checkout staging && git push origin staging

# Ver logs staging
vercel logs https://staging.attickkeller.com --scope=agamenonmacondo-2870s-projects

# Ver logs prod
vercel logs https://web-rosy-nine-64.vercel.app --scope=agamenonmacondo-2870s-projects

# Diff staging vs master
git log staging..master --oneline
git log master..staging --oneline
```

---

## Rollback Rápido

```bash
# Si prod roto tras merge staging→master:
git checkout master
git revert HEAD  # o revert commit específico
git push origin master
# Vercel re-deploya automáticamente commit anterior

# Staging queda intacto para investigar
```

---

## Próximos Pasos (Post-Setup)

1. [ ] Crear proyecto Supabase staging
2. [ ] Configurar `attick-keller-staging` en Vercel con env vars staging
3. [ ] Configurar DNS `staging.attickkeller.com`
4. [ ] Primer deploy staging + validar checklist
5. [ ] Documentar URLs y credenciales de acceso staging en `STATE.md`
6. [ ] Entrenar al equipo en flujo feature → staging → master

---

## Referencias

- `docs/bugs-resueltos-junio2026.md` — Bugs que motivaron esta arquitectura
- `PROTOCOL.md` — Protocolos de desarrollo actualizados
- `VERCEL_PROJECTS.md` — (este archivo) Arquitectura de entornos