# Convencion de Documentacion — Attick & Keller

> **Regla obligatoria**: Antes de desarrollar, leer el .md correspondiente.
> Antes de hacer commit, actualizar el .md si hubo cambios significativos.
> Si el archivo no tiene .md y es Nivel 1 o 2, crearlo.

---

## 3 Niveles de Documentacion

### Nivel 1 — .md Completo (~15-20 archivos)

Archivos con logica compleja, datos cruzados, o pitfalls ocultos.

Secciones obligatorias:

```markdown
# NombreDelComponente

## Proposito
Que hace, para quien, en que contexto.

## Datos
- Que APIs consume (metodo, endpoint, tablas)
- Que tablas toca directamente
- Workaround usados (ej: "3 queries + merge manual, NO joins")

## Dependencias
- Lo usa: [lista de componentes/archivos]
- Usa a: [lista de dependencias internas]

## Pitfalls
- Cosas que rompen este componente y no son obvias
- Referencia a DATABASE.md para detalles del esquema

## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| YYYY-MM-DD | Nombre | Descripcion corta |
```

### Nivel 2 — .md Compacto (~50-60 archivos)

API routes y componentes medianos. Formato reducido:

```markdown
# nombre-del-route.ts

- **Que hace**: Descripcion en una linea
- **Datos**: Tablas o APIs que toca
- **Auth**: Que rol requiere
- **Pitfalls**: Lo que podria romperse (1-2 lineas)
```

### Nivel 3 — JSDoc (resto, ~200 archivos)

Componentes simples, tipos, utilidades. Comentario en el propio archivo:

```typescript
/** Tabla de mesas con colores por estado — usado en TableMapEditor.tsx */
export function TableGrid({ ... })
```

---

## Quien es Nivel 1, 2 o 3?

### Nivel 1 (completo)

**Componentes:**
- `ShiftSchedulePanel.tsx` — 678 lineas, 4 tabs, 3 areas, estado complejo
- `MenuItemForm.tsx` — pills de categoria, costeo, APIs sin joins
- `MenuPanel.tsx` — 3 tabs, vinculo con POS, RecipePanel
- `POSDashboardPanel.tsx` — metricas, ventas, graficas
- `AdminShell.tsx` — layout principal, tabs, navegacion
- `TeamPanel.tsx` — gestion de equipo, roles
- `ReservationPanel.tsx` — reservas, estados, asignacion de mesas
- `CustomerPanel.tsx` — CRM, tags, campanas
- `NominaPanel.tsx` — nomina, periodos, detalles

**APIs:**
- `admin/staff/route.ts` — CRUD de roles, validacion de roles
- `admin/pos-ingredients/route.ts` — 3 queries + merge manual (sin joins)
- `admin/shift-schedules/route.ts` — turnos complejos con areas
- `admin/shift-schedules/[id]/publish/route.ts` — publicacion de cronogramas
- `admin/menu/items/[id]/ingredients/route.ts` — CRUD ingredientes

**Auth:**
- `lib/utils/admin-auth.ts` — base de toda la autenticacion
- `lib/auth/auth-provider.tsx` — contexto React de auth
- `middleware.ts` — proteccion de rutas por rol

### Nivel 2 (compacto)

Todas las demas API routes en `src/app/api/admin/` y componentes medianos en `src/components/admin/`.

### Nivel 3 (JSDoc)

Tipos en `src/lib/types/`, utilidades en `src/lib/utils/`, componentes UI base en `src/components/ui/`, componentes publicos simples.

---

## Regla para Nuevos Desarrollos

**Antes de codear:**
1. Leer el .md del archivo que vas a modificar (si existe)
2. Si no existe y es Nivel 1 o 2, crearlo antes
3. Consultar `docs/DATABASE.md` si vas a tocar queries
4. Consultar `docs/ARCHITECTURE.md` para flujos cruzados

**Despues de codear:**
1. Actualizar la seccion `## Historial` del .md afectado
2. Si creaste un archivo nuevo de Nivel 1 o 2, crear su .md
3. Si modificaste tablas o queries, actualizar `docs/DATABASE.md`
4. Si modificaste flujos o dependencias, actualizar `docs/ARCHITECTURE.md`

---

## Formato del Historial

```markdown
## Historial
| Fecha | Agente | Cambio |
|-------|--------|--------|
| 2026-05-29 | Ninja | fix: rol reservante agregado a enum, API, formulario, middleware |
| 2026-05-28 | Ninja | feat: pills de categoria + single fetch en MenuItemForm |
| 2026-05-28 | Ninja | fix: dark theme colors, debug bar removida |
```

Una linea por cambio. Sin detalles de implementacion — para eso esta el git log.