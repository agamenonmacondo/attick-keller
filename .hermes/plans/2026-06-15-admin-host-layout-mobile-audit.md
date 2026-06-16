# Auditoría + Plan — Componentes Admin / Host / Layout

> Fecha: 2026-06-15  
> Alcance: `src/components/admin/**/*`, `src/components/host/**/*`, `src/components/layout/**/*`  
> Referencias: `DESIGN.md`, `DESIGN_DARK_THEME.md`, `DESIGN-HOST-V2.md`, `src/app/globals.css`

## 1. Resumen ejecutivo

El sistema **ya aplica la mayoría de los tokens de color** via CSS custom properties, y `globals.css` tiene overrides genéricos de Tailwind para dark mode que salvan docenas de componentes. Sin embargo, hay **tres frentes críticos** que afectan usabilidad real en producción:

1. **Contrastes rotos en headers** (Admin/Host/Layout): texto marrón oscuro sobre fondo madera oscura en modo claro.
2. **Deuda técnica visual**: colores hex hardcodeados, fuentes inline (`font-['Playfair_Display']`), `style={{ transition: ... }}` disperso en ~89 lugares, y badges de urgencia con colores incorrectos.
3. **Mobile incompleto**: FAB del host tapa contenido, tablas administrativas usan `hidden md:block` sin vista alternativa, tab bars horizontales sin scrollbar oculto, touch targets pequeños, y el layout Navbar no tiene menú móvil.

A continuación: hallazgos detallados, prioridad y plan de ejecución por fases.

---

## 2. Hallazgos clasificados por severidad

### 🔴 P0 — Bugs de contraste / accesibilidad (corregir ya)

| Archivo | Línea(s) | Problema | Impacto |
|---------|----------|----------|---------|
| `src/components/admin/AdminHeader.tsx` | 20-24 | `bg-[var(--color-ak-madera)]/95` con `text-[var(--text-primary)]` y `bg-[var(--color-ak-madera)]/60`. En light mode, ambos son tonos de marrón oscuro → el badge "Admin" es casi invisible. | Header ilegible |
| `src/components/host/HostHeader.tsx` | 22-28 | Igual que arriba: badge "Host" con `text-[var(--text-primary)]` sobre madera oscura. | Header ilegible |
| `src/components/layout/Navbar.tsx` | 23 | `text-white` fijo sobre `bg-transparent`. Depende del hero; en scroll se vuelve madera oscura, OK, pero sin fallback de contraste. Además `hover:bg-[var(--color-accent)]` es igual a `bg-[var(--color-ak-borgona)]`, no hay feedback visual. | CTA sin feedback |
| `src/components/layout/Footer.tsx` | 29 | `text-[var(--text-secondary)]` sobre `bg-[var(--color-ak-madera)]` (marrón #8D6E63 sobre #3E2723 → ~2.5:1). | Texto ilegible |
| `src/components/host/HostTableMap.tsx` | 139 | Urgencia "info" (31-60 min) usa `bg-[var(--color-accent)]` que es borgona. `DESIGN-HOST-V2.md` especifica **azul #1565C0**. | Confusión de estado |
| `src/components/host/HostReservationQueue.tsx` | 430 | `text-[#8D6E63]` hardcodeado en lugar de `var(--text-secondary)`. Rompe dark mode. | Dark mode roto |
| `src/components/admin/floorplan/FloorPlanMap.tsx` | 40-50 | Colores de zona hardcodeados en hex (`#9B8AF5`, `#E07070`, `#6AA0D0`, etc.) que no pertenecen a la paleta warm de marca. | Branding inconsistente |

### 🟡 P1 — Mobile UX / funcionalidad

| Archivo | Problema | Recomendación |
|---------|----------|---------------|
| `src/components/host/HostShell.tsx` | FAB de walk-in fixed `bottom-6 right-6` sin padding compensatorio en `<main>`; el contenido final queda tapado. | Agregar `pb-24` (o `pb-[max(6rem,env(safe-area-inset-bottom)+5rem)]`) al contenedor principal. |
| `src/components/admin/AdminTabBar.tsx` | `overflow-x-auto` sin clase `scrollbar-hide`; en mobile aparece scrollbar nativo feo. | Añadir `scrollbar-hide` o `-webkit-scrollbar: none` y aria-label. |
| `src/components/admin/reservations/StatusFilter.tsx` | Mismo problema: `overflow-x-auto` sin ocultar scrollbar. | Aplicar utilidad `scrollbar-hide`. |
| `src/components/admin/reservations/ServiceFilter.tsx` | `overflow-x-auto border-b` con `border-[var(--color-ak-madera)]/20`; scroll visible. | Unificar con `scrollbar-hide`. |
| `src/components/admin/shifts/StaffPanel.tsx:332` | `hidden md:block overflow-x-auto` → **no hay versión móvil** de la tabla de personal. | Implementar vista de cards para `<md`. |
| `src/components/admin/shifts/ShiftTimelineView.tsx:111` | `hidden md:block` → no hay vista móvil del timeline. | Crear vista compacta/lista para móvil. |
| `src/components/admin/shifts/ShiftGrid.tsx:326` | `hidden md:block` → no hay vista móvil de la grilla semanal. | Crear cards por día o lista de turnos. |
| `src/components/admin/shifts/SalesReferenceTab.tsx:221` | `hidden md:block` → no hay vista móvil. | Lista/cards para móvil. |
| `src/components/admin/nomina/NominaContablePanel.tsx` y `NominaUnifiedPanel.tsx` | Múltiples `overflow-x-auto` con tablas; están presentes en mobile pero requieren scroll horizontal. | Revisar columnas prioritarias; ocultar columnas secundarias en mobile o convertir a cards. |
| `src/components/admin/reservations/ReservationsPanel.tsx` | Usa `alert()` para errores de API. | Reemplazar por el componente `ConfirmDialog` o toast inline ya usado en host. |
| `src/components/admin/reservations/ReservationsPanel.tsx:246` | Detail popup contenedor no tiene fondo propio (`w-full max-w-lg` sin `bg-card` ni bordes). Si `ReservationDetail` cambia, el popup se rompe. | Envolver en card con `bg-[var(--bg-card)] rounded-2xl border ...`. |
| `src/components/layout/Navbar.tsx` | No hay menú hamburguesa; en mobile solo logo + "Reservar" + "Mi Perfil". Si hay más links futuros, no caben. | Opcional: agregar `<Sheet>` móvil con links relevantes. |
| Varios icon-only buttons | Close buttons con `p-1` (ej. `HostWalkInForm.tsx:178`, `ReassignModal.tsx:177`) → 28×28 px. | Forzar `min-h-[44px] min-w-[44px]` en botones táctiles. |

### 🟢 P2 — Calidad / consistencia de tokens

| Problema | Ejemplos | Recomendación |
|----------|----------|---------------|
| Uso de `font-['Playfair_Display']` en lugar del token `--font-display` | AdminHeader, HostHeader, HostTableMap, HostWalkInForm, HostReservationQueue, HostOccupancySummary, ReservationCalendar, etc. (~49 ocurrencias) | Migrar a `font-[family-name:var(--font-display)]` o asegurar que `font-display` funcione en Tailwind v4 y usarlo. |
| Transiciones inline `style={{ transition: ... }}` | ~89 ocurrencias en 37 archivos. | Reemplazar por clases Tailwind `transition-all duration-200` o `transition-colors`. |
| `dark:` variants redundantes para brand colors | `dark:border-[var(--color-ak-borgona-light)]`, `dark:bg-[var(--color-ak-borgona-light)]` en host y admin. | `DESIGN_DARK_THEME.md` dice que un solo `var(--color-ak-borgona)` basta. Limpiar para reducir deuda. |
| `text-white` en botones de acción sobre borgona/oliva | Generalmente OK porque el fondo es oscuro, pero verificar en light/dark. | Mantener; no es bug. |
| Colores hex en gráficos/charts | `CostEstimationBar`, `POSCostPanel`, `CategoryBreakdown`, `AutoScheduleTab`, etc. | Documentar paleta de charts; mapear a variables de marca donde sea posible para mantener dark mode coherente. |
| `bg-red-50 dark:bg-red-900/20` en errores | `HostWalkInForm.tsx:297` | Usar `bg-[var(--color-danger)]/10` o similar en ambos temas para no depender de Tailwind red genérico. |
| `SectionHeading.tsx` | Fuerza `dark:text-[var(--color-ak-borgona-light)]`; el spec no pide títulos borgoña en dark. | Revertir a `text-[var(--text-secondary)]` consistente. |
| `ReservationDetail.tsx` (host) | Email usa `text-[var(--color-accent)]` (borgona). No distingue bien de nombre. | Usar `text-[var(--color-ak-ambar)]` o `text-[var(--text-secondary)]` para email. |

### ⚪ P3 — Optimizaciones avanzadas

| Problema | Recomendación |
|----------|---------------|
| `HostTableMap.tsx` bottom-sheet no bloquea scroll del body. | Agregar `useLockBodyScroll` cuando `activeTableId !== null`. |
| `ReservationCalendar.tsx` detecta dark mode manualmente con `useTheme` para cambiar clases. | Simplificar usando únicamente CSS vars con opacidades (ej. `bg-[var(--color-ak-borgona)]/15 text-[var(--text-primary)]`). |
| `FloorPlanMap.tsx` hardcodea posiciones? (no auditado en profundidad) | Revisar que el plano sea pan/zoom en móvil y no dependa de hover. |
| Animaciones `whileTap` + inline transition pueden chocar. | Revisar conflictos Framer Motion vs CSS transitions. |

---

## 3. Plan de mejora por fases

### Fase 1 — Correcciones críticas de contraste y tokens (1-2 días)

Objetivo: dejar los headers, footer y badges legibles en ambos temas sin tocar lógica de negocio.

1. **Crear utilidades reutilizables** en `src/lib/utils/cn.ts` o nuevo `src/components/ui/`:
   - `headerTextClass = "text-[var(--color-ak-cal)]"` (para texto sobre madera oscura).
   - `headerMutedClass = "text-[var(--color-ak-cal)]/70"`.
2. **AdminHeader.tsx** y **HostHeader.tsx**:
   - Logo/title/badge: `text-[var(--color-ak-dorado)]` y `text-[var(--color-ak-cal)]/90`.
   - Badge "Admin"/"Host": fondo `bg-white/10` (se mapea a warm en dark) y texto `text-[var(--color-ak-cal)]`.
   - Íconos/links: `text-[var(--color-ak-cal)]/80 hover:text-[var(--color-ak-dorado)]`.
3. **Footer.tsx**:
   - Cambiar subtítulos a `text-[var(--color-ak-cal)]/70`.
   - Borde superior a `border-[var(--color-ak-ladrillo)]/50`.
4. **HostTableMap.tsx**:
   - Urgencia `info`: usar `bg-blue-500 dark:bg-blue-400` o añadir `--color-info` en `globals.css` y usarlo. Actualizar leyenda correspondiente.
5. **HostReservationQueue.tsx**: reemplazar `text-[#8D6E63]` por `text-[var(--text-secondary)]`.
6. **FloorPlanMap.tsx**: mapear zonas a colores de marca (ver tabla propuesta abajo).

**Colores de zona propuestos (dentro de la paleta warm):**

| Zona | Color |
|------|-------|
| Taller | `var(--color-ak-madera)` |
| Salón Central | `var(--color-ak-borgona)` |
| Barra | `var(--color-ak-oliva)` |
| Tipi | `var(--color-ak-dorado)` |
| Semi-Privado | `var(--color-ak-ambar)` |
| Jardín | `var(--color-ak-oliva)` |
| Chispas | `var(--color-ak-ladrillo)` |
| Ático / Attic / Lounge | `var(--text-secondary)` |

### Fase 2 — Mobile UX de Host ✅ (aplicada)

1. **HostShell.tsx**:
   - ✅ Añadido `pb-24 lg:pb-8` al contenedor de contenido.
   - ✅ FAB: posición con `env(safe-area-inset-*)` y transición Tailwind.
2. **HostTableMap.tsx**:
   - ✅ Botón cerrar del bottom-sheet: `min-h-[44px] min-w-[44px]`.
   - ✅ Creado y aplicado `useLockBodyScroll` al abrir bottom-sheet.
3. **HostWalkInForm.tsx** / **ReassignModal.tsx**:
   - ✅ Safe-area padding-bottom en modales.
   - ✅ Botón close `min-h-[44px] min-w-[44px]`.
   - ✅ Error de Walk-in usa tokens semánticos (`bg-[var(--color-danger)]/10`).

> Pendiente menor: stack vertical de acciones en `HostReservationQueue` en pantallas < 360 px; grid actual ya es usable.

### Fase 3 — Mobile UX de Admin: tablas y tab bars ✅ (parcial)

1. **Tab bars con scroll**:
   - ✅ `AdminTabBar.tsx`, `StatusFilter.tsx`, `ServiceFilter.tsx`: `scrollbar-hide` + `aria-label`.
   - Utilidad `.scrollbar-hide` añadida a `globals.css`.
2. **Vistas móviles para tablas ocultas**:
   - ✅ Auditado: `StaffPanel.tsx`, `ShiftTimelineView.tsx`, `ShiftGrid.tsx`, `SalesReferenceTab.tsx` **ya tienen** vistas móviles en cards; no requieren rework mayor.
3. **ReservationsPanel.tsx**:
   - ✅ `alert()` reemplazados por toast de error semántico.
   - ✅ `window.confirm()` reemplazado por `ConfirmDialog`.
   - ✅ Popup de detalle envuelto en card con `bg-card`, border, rounded-2xl, shadow y safe-area.
4. **ReservationCalendar.tsx**:
   - ⏸️ Detección manual de dark mode aún existe; se deja como deuda técnica para Fase 4/5 (no bloqueante para mobile).

### Fase 4 — Deuda técnica visual ✅

1. **Estandarizar fuentes**:
   - ✅ Actualizados tokens en `globals.css` para apuntar a variables Next.js font.
   - ✅ Migradas 49 ocurrencias en `src/components` a `font-[family-name:var(--font-*)]`.
   - ✅ `layout.tsx` body usa `font-[family-name:var(--font-body)]`.
2. **Eliminar transiciones inline**:
   - ✅ Reemplazados 85 `style={{ transition: ... }}` en `src/components` por clases Tailwind.
   - ✅ Solo se preservó SVG stroke transition en `OccupancyGauge.tsx`.
3. **Limpiar `dark:` redundantes** en brand colors:
   - ✅ Limpieza en `AdminTabBar.tsx` y paneles de nómina.
4. **Añadir `--color-info`** en `globals.css`:
   - ✅ Añadido para estado "1h".
5. **Crear `useLockBodyScroll` hook**:
   - ✅ Creado en `src/lib/hooks/useLockBodyScroll.ts`.

### Fase 5 — Componentes compartidos y layout público ✅

1. **Navbar.tsx**:
   - ✅ Menú hamburguesa móvil implementado con drawer desde la derecha.
   - ✅ Links dinámicos según auth/rol.
   - ✅ CTA "Reservar" oculto en mobile sm y visible en menú hamburguesa.
   - ✅ Touch targets 44×44 en botones de menú.
2. **Footer.tsx**:
   - ✅ Contraste corregido en copyright.
3. **Shared components**:
   - ✅ `SectionHeading.tsx`: eliminado `dark:` no especificado.
   - ✅ `AnimatedCard.tsx`: eliminados `dark:` redundantes.
   - ✅ `EmptyState.tsx`: eliminado `dark:` redundante.
   - ✅ `StatusBadge.tsx`: eliminado `dark:` redundante para estado `seated`.

---

## 4. Checklist de archivos a tocar

### Layout
- [x] `src/components/layout/Navbar.tsx`
- [x] `src/components/layout/Footer.tsx`

### Admin — estructura
- [x] `src/components/admin/AdminHeader.tsx`
- [x] `src/components/admin/AdminTabBar.tsx`
- [x] `src/components/admin/AdminShell.tsx`

### Admin — reservas
- [x] `src/components/admin/reservations/ReservationsPanel.tsx`
- [x] `src/components/admin/reservations/ReservationCalendar.tsx`
- [x] `src/components/admin/reservations/StatusFilter.tsx`
- [x] `src/components/admin/reservations/ServiceFilter.tsx`
- [ ] `src/components/admin/reservations/ReservationDetail.tsx` (sin prioridad, no es del alcance core)
- [ ] `src/components/admin/reservations/ReservationForm.tsx` (sin prioridad)

### Admin — plano / turnos / nómina
- [x] `src/components/admin/floorplan/FloorPlanMap.tsx`
- [x] `src/components/admin/shifts/StaffPanel.tsx` (vista mobile ya existe)
- [x] `src/components/admin/shifts/ShiftTimelineView.tsx` (vista mobile ya existe)
- [x] `src/components/admin/shifts/ShiftGrid.tsx` (vista mobile ya existe)
- [x] `src/components/admin/shifts/SalesReferenceTab.tsx` (vista mobile ya existe)
- [x] `src/components/admin/nomina/NominaContablePanel.tsx` (limpiados dark: redundantes + scrollbar-hide en tabs)
- [x] `src/components/admin/nomina/NominaUnifiedPanel.tsx` (limpiados dark: redundantes + scrollbar-hide en tabs)
- [x] `src/components/admin/nomina/NominaPanel.tsx` (limpiados dark: redundantes)

### Host
- [x] `src/components/host/HostHeader.tsx`
- [x] `src/components/host/HostShell.tsx`
- [x] `src/components/host/HostTableMap.tsx`
- [ ] `src/components/host/HostReservationQueue.tsx` (stack vertical < 360px — mejora opcional)
- [x] `src/components/host/HostWalkInForm.tsx`
- [x] `src/components/host/ReassignModal.tsx`
- [x] `src/components/host/ReservationDetail.tsx`
- [ ] `src/components/host/HostOccupancySummary.tsx` (sin prioridad)

### Shared
- [x] `src/components/admin/shared/SectionHeading.tsx`
- [x] `src/components/admin/shared/StatusBadge.tsx`
- [x] `src/components/admin/shared/EmptyState.tsx`
- [x] `src/components/admin/shared/AnimatedCard.tsx`

### Globals / hooks
- [x] `src/app/globals.css`
- [x] `src/lib/hooks/useLockBodyScroll.ts`
- [ ] `src/components/admin/shared/MobileDataList.tsx` (no requerido: vistas mobile ya existen)

---

## 5. Métricas de éxito

- [ ] Header Admin/Host/Footer pasan AA (4.5:1) en light y dark.
- [ ] Ningún `text-[#...]` hardcodeado en `src/components/host`.
- [ ] Cero `style={{ transition: ... }}` en componentes auditados.
- [ ] Todos los botones táctiles ≥ 44×44 px.
- [ ] Tablas administrativas tienen vista alternativa usable en viewport 375 px.
- [ ] HostShell no esconde contenido detrás del FAB.
- [ ] Lighthouse "Mobile Friendly" y "Accessibility" sin errores contrast/layout en `/admin` y `/host`.

---

## 6. Notas de implementación

- No tocar lógica de negocio ni algoritmos de asignación; solo UI/tokens/mobile.
- Preferir **variables CSS** sobre `dark:` variants para colores de marca, conforme al spec.
- Para móvil, usar `min-h-[dvh]`/`pb-safe` y `env(safe-area-inset-bottom)` en modales/FAB.
- Mantener Framer Motion pero no mezclar `whileTap` con transiciones CSS inline en el mismo elemento.
- Crear componentes reutilizables para evitar duplicar lógica de vista móvil en cada tabla.
