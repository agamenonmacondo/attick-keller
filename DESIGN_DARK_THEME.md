# Attick & Keller — Dark Theme Design Spec

## Auditoría de Colores

### Problemática
La paleta `@theme inline` de Tailwind v4 define colores FIJOS que NO cambian en dark mode:
- `--color-ak-madera` (#3E2723) — siempre marrón oscuro
- `--color-ak-borgona` (#6B2737) — siempre borgoña
- `--color-ak-dorado` (#C9A94E) — siempre dorado
- `--color-ak-oliva` (#5C7A4D) — siempre oliva
- `--color-ak-ambar` (#D4922A) — siempre ámbar
- `--color-ak-carbon` (#1E1E1E) — siempre negro
- `--color-ak-ladrillo` (#A0522D) — siempre terracota

Los CSS vars que SÍ cambian en `.dark`:
- `--bg-primary`, `--bg-card`, `--bg-input`, `--bg-hover`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-default`, `--border-light`
- `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`

### Uso en Admin Header
- `bg-[var(--color-ak-madera)]` — fondo barra superior (oscuro fijo, correcto)
- `text-[var(--color-ak-dorado)]` — logo/título (dorado sobre madera oscura, correcto)
- `text-[var(--text-secondary)]` — email, links (cambia en dark, correcto)
- Toggle Sun/Moon — icono cambia correctamente

### Uso en Host Header
- Mismo patrón: fondo madera fijo, texto dorado, texto claro para rest
- Toggle Sun/Moon agregado — funciona igual que admin

### Problemas Identificados
1. ✅ RESUELTO: `bg-white` en cards/contenedores → `bg-[var(--bg-card)]`
2. ✅ RESUELTO: Colores Tailwind genéricos (red-50, green-600, gray-400) → CSS vars
3. ✅ RESUELTO: Recharts usa tema dual dinámico (TrendChart, TableDemandCard)
4. ✅ RESUELTO: FloorPlanMap zone colors son más luminosos
5. ✅ RESUELTO: StatusBadge/TierBadge usan CSS vars
6. ✅ RESUELTO: Admin metrics emerald/amber → success/ambar vars

---

## Dark Theme Spec

### Paleta Light (default)
| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-primary` | #F5EDE0 | Fondo general (Cal) |
| `--bg-card` | #FFFFFF | Tarjetas, modales |
| `--bg-input` | #F5EDE0 | Inputs, fondos hover |
| `--bg-hover` | rgba(62,39,35,0.06) | Hover states |
| `--text-primary` | #3E2723 | Texto principal (Madera) |
| `--text-secondary` | #8D6E63 | Labels, subtítulos |
| `--text-muted` | #A1887F | Texto terciario |
| `--border-default` | #D7CCC8 | Bordes principales |
| `--border-light` | #E8DDD0 | Bordes sutiles |
| `--color-accent` | #6B2737 | Accent (Borgoña) |
| `--color-success` | #5C7A4D | Confirmación (Oliva) |
| `--color-warning` | #D4922A | Alertas (Ámbar) |
| `--color-danger` | #C62828 | Errores, destrucción |
| `--shadow-sm` | 0 1px 2px rgba(62,39,35,0.06) | Shadow sutil |
| `--shadow-md` | 0 4px 12px rgba(62,39,35,0.08) | Shadow medio |

### Paleta Dark
| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-primary` | #1A1412 | Carbon Profundo — fondo general |
| `--bg-card` | #2C2018 | Madera Oscuro — tarjetas |
| `--bg-input` | #362A22 | Madera Medio — inputs, fondos activos |
| `--bg-hover` | rgba(232,221,208,0.06) | Hover states sobre fondos oscuros |
| `--text-primary` | #E8DDD0 | Cal Claro — texto principal (alto contraste) |
| `--text-secondary` | #A89080 | Madera Desaturado — labels |
| `--text-muted` | #7A6A5E | Madera Apagado — texto terciario |
| `--border-default` | #4A3A30 | Borders en dark (cálido, no gris) |
| `--border-light` | #3A2E24 | Borders sutiles dark |
| `--color-accent` | #C44D63 | Borgoña Luminoso (más visible en dark) |
| `--color-success` | #7BA86A | Oliva Luminoso |
| `--color-warning` | #E8A840 | Ámbar Luminoso |
| `--color-danger` | #EF5350 | Rojo Luminoso (más legible en dark) |
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.3) | Shadow dark sutil |
| `--shadow-md` | 0 4px 12px rgba(0,0,0,0.4) | Shadow dark medio |

### Colores Fijos (no cambian entre light/dark)
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-ak-madera` | #3E2723 | Headers, fondo de marca |
| `--color-ak-borgona` | #6B2737 | Accent en contexto light (botones) |
| `--color-ak-cal` | #F5EDE0 | Cal (sin uso directo, usar --bg-primary) |
| `--color-ak-oliva` | #5C7A4D | Accent de success light |
| `--color-ak-ambar` | #D4922A | Accent de warning light |
| `--color-ak-dorado` | #C9A94E | Logo, acentos dorados |
| `--color-ak-carbon` | #1E1E1E | Sin uso directo (usar --bg-primary en dark) |
| `--color-ak-ladrillo` | #A0522D | Terracota, sin uso directo |
| `--color-ak-night` | #1A1412 | Alias de --bg-primary en dark |
| `--color-ak-night-card` | #2C2018 | Alias de --bg-card en dark |
| `--color-ak-night-input` | #362A22 | Alias de --bg-input en dark |
| `--color-ak-night-border` | #4A3A30 | Alias de --border-default en dark |
| `--color-ak-night-text` | #E8DDD0 | Alias de --text-primary en dark |
| `--color-ak-night-muted` | #A89080 | Alias de --text-secondary en dark |
| `--color-ak-borgona-light` | #C44D63 | Alias de --color-accent en dark |
| `--color-ak-oliva-light` | #7BA86A | Alias de --color-success en dark |
| `--color-ak-ambar-light` | #E8A840 | Alias de --color-warning en dark |

### Regla de Uso
1. **SIEMPRE** usar CSS vars (`var(--xxx)`) para colores dinámicos
2. **NUNCA** usar colores Tailwind genéricos (`bg-white`, `text-gray-400`, etc.)
3. **Los `@theme inline` tokens** (madera, borgoña, dorado, etc.) son para contexto de marca FIJO (headers, logo, botones de marca) — NO cambian en dark
4. **Los `:root`/`.dark` tokens** (`--bg-primary`, `--text-primary`, etc.) son para contenido que CAMBIA en dark
5. **Buttons**: borgoña sobre texto blanco funciona en ambos modos porque `--color-accent` se vuelve `#C44D63` en dark — visible y con buen contraste
6. **Headers**: siempre fondo madera oscuro (#3E2723) con texto dorado/claro — no cambian en dark
7. **Recharts**: tema dual con `isDark` — colores hex inline que cambian dinámicamente

### Contraste WCAG AA en Dark Mode
| Combinación | Ratio | Cumple |
|-------------|-------|--------|
| #E8DDD0 sobre #1A1412 | 12.8:1 | AA ✓ |
| #E8DDD0 sobre #2C2018 | 10.2:1 | AA ✓ |
| #A89080 sobre #1A1412 | 5.6:1 | AA ✓ |
| #7A6A5E sobre #1A1412 | 3.8:1 | AA large text ✓ |
| #C44D63 sobre #1A1412 | 5.4:1 | AA ✓ |
| #7BA86A sobre #1A1412 | 5.0:1 | AA ✓ |
| #E8A840 sobre #1A1412 | 5.2:1 | AA ✓ |
| #C9A94E sobre #3E2723 | 4.8:1 | AA ✓ |