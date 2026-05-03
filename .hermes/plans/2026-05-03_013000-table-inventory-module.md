# Plan: Módulo Admin de Inventario de Mesas

## Objetivo
Crear un módulo de administración de mesas que permite al administrador del restaurante gestionar el inventario completo: activar/desactivar mesas, crear/editar/eliminar zonas y mesas, y manejar combinaciones. Todo con tests unitarios por componente.

## Contexto Actual
- **Proyecto**: `/mnt/f/attick-keller/web/` (Next.js 16, React 19, TypeScript, Tailwind 4, Phosphor Icons, Framer Motion)
- **DB**: Supabase — proyecto `pbllaipsdfypelnwrvpy`
- **45 mesas** en 5 zonas (Taller, Tipi, Jardín, Chispas, Attic)
- **DB ya tiene columnas**: `capacity_min`, `name_attick`, `can_combine`, `combine_group`
- **Testing**: Playwright instalado (devDependency), pero SIN tests existentes aún. No hay vitest ni jest.
- **Patrones existentes**: AdminShell con tabs, componentes en `admin/*/`, hooks en `lib/hooks/`, APIs en `app/api/admin/*/`
- **Deploy**: Vercel desde branch `master`

## Estrategia de Implementación

### Enfoque TDD + Claude Code
- **Claude Code** escribe la implementación (código productivo)
- **Codex** NO — usamosvitest + React Testing Library para tests unitarios
- Cada parte se desarrolla en orden, con tests primero (RED) → implementación (GREEN) → refactor

### Stack de Testing a Instalar
- `vitest` — test runner
- `@testing-library/react` — testear componentes React
- `@testing-library/jest-dom` — matchers adicionales (toBeInTheDocument, etc.)
- `msw` — mock service worker para mockear APIs

### Orden de Ejecución (4 partes, cada una testeable)

---

## PARTE 1: Setup de Tests + API Routes

### Archivos nuevos:
- `web/vitest.config.ts` — configuración de vitest
- `web/src/app/api/admin/inventory/zones/route.ts` — CRUD zonas (GET, POST, PATCH, DELETE)
- `web/src/app/api/admin/inventory/tables/route.ts` — GET/PATCH batch de mesas
- `web/src/app/api/admin/inventory/tables/[id]/route.ts` — PATCH toggle, DELETE mesa individual
- `web/src/app/api/admin/inventory/combinations/route.ts` — CRUD combinaciones

### Tests:
- `web/src/app/api/admin/inventory/__tests__/zones.test.ts`
- `web/src/app/api/admin/inventory/__tests__/tables.test.ts`

### Validación:
```bash
npx vitest run src/app/api/admin/inventory/__tests__/
```

---

## PARTE 2: Hook + Tipos TypeScript

### Archivos nuevos:
- `web/src/lib/types/inventory.ts` — interfaces Zone, Table, Combination
- `web/src/lib/hooks/useTableInventory.ts` — hook que llama las APIs de inventory

### Tests:
- `web/src/lib/hooks/__tests__/useTableInventory.test.ts`

### Validación:
```bash
npx vitest run src/lib/hooks/__tests__/useTableInventory.test.ts
```

---

## PARTE 3: Componentes de UI

### Archivos nuevos:
- `web/src/components/admin/inventory/TablesPanel.tsx` — panel principal (3 sub-tabs)
- `web/src/components/admin/inventory/ZoneEditor.tsx` — CRUD zonas con reordenar
- `web/src/components/admin/inventory/TableEditor.tsx` — CRUD mesas con toggle switch
- `web/src/components/admin/inventory/CombinationEditor.tsx` — CRUD combinaciones
- `web/src/components/admin/inventory/TableCard.tsx` — card individual de mesa con toggle
- `web/src/components/admin/inventory/ZoneBadge.tsx` — badge de zona con color

### Tests:
- `web/src/components/admin/inventory/__tests__/TableCard.test.tsx`
- `web/src/components/admin/inventory/__tests__/ZoneEditor.test.tsx`
- `web/src/components/admin/inventory/__tests__/TableEditor.test.tsx`

### Validación:
```bash
npx vitest run src/components/admin/inventory/__tests__/
```

---

## PARTE 4: Integración + Deploy

### Archivos modificados:
- `web/src/components/admin/AdminTabBar.tsx` — agregar tab "Mesas"
- `web/src/components/admin/AdminShell.tsx` — renderizar TablesPanel

### Validación:
```bash
npm run build
git push origin main:master
```

---

## Especificaciones Funcionales

### Toggle de Mesa (is_active)
- Switch animado (verde = activa, gris = inactiva)
- PATCH inmediato al backend al hacer click
- Mesa inactiva se muestra atenuada (opacity: 0.5)
- Toast de confirmación

### Editor de Zonas
- Lista de zonas con drag-reorder
- Inline edit de nombre y descripción
- Botón eliminar (solo si no tiene mesas activas)
- Botón crear zona nueva
- Colores por zona (Taller=rojo, Tipi=azul, Jardín=verde, Chispas=amarillo, Attic=púrpura)

### Editor de Mesas
- Filtro por zona
- Cada mesa es un card con: número, nombre, capacidad (min-max), zona, toggle activo
- Click en card → modo edición inline (nombre, capacidad min/max, zona, can_combine, combine_group)
- Botón crear mesa nueva
- Botón eliminar mesa (solo si no tiene reservas activas)

### Editor de Combinaciones
- Lista de combinaciones existentes
- Crear combinación: seleccionar mesas, capacidad combinada
- Eliminar combinación

### Resumen (header del panel)
- Total mesas / activas / inactivo
- Capacidad total (rango min-max)
- Por zona: conteo de mesas

---

## Esquema de Colores (consistente con app existente)
- Primario: `#6B2737` (burgundy)
- Fondo: `#F5EDE0` (cream)
- Texto: `#3E2723` (dark brown)
- Secundario: `#8D6E63` (muted brown)
- Activo: `#4CAF50` (green)
- Inactivo: `#9E9E9E` (gray)

---

## Riesgos y Mitigaciones
1. **Sin tests existentes** → Instalar vitest + RTL desde cero, configurar con Next.js
2. **API routes usan cookies** → Tests de API necesitan mockear auth o usar service_role directo
3. **Mobile-first** → Todos los componentes deben ser responsive
4. **Deploy branch** → Siempre push a `origin main:master`, no a `main`