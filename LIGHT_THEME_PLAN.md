# Plan: Re-implementar Light Theme con Colores del Logo

## Fuente: `/home/mod/ak_logos/ak_brand_kit.json`

## Diagnóstico del Problema Actual

El light theme actual tiene `--color-ak-madera: #0D1015` (negro profundo) — esto era
correcto en dark mode pero en light mode hace que:
- Logo text en `madera` sea negro invisible sobre fondos oscuros
- Links, acentos, y bordes en `madera` se vean como negro puro
- El header Admin/Host en light usa `bg-white/95` parchado con inline styles

La raíz: los CSS vars en `:root` (light) no usan la paleta del logo.

## Paleta del Logo (ak_brand_kit.json)

| Elemento | Color | Hex | Uso en light theme |
|----------|-------|-----|-------------------|
| Logo text (Logos 1&2) | Slate Blue | `#34495E` | Texto principal, headings |
| Logo text (Logo 2 alt) | Slate Blue-Grey | `#4A6274` | Texto secundario |
| K backdrop / accent | Rust/Terracotta | `#9A4335` | Acento primario, bordes |
| Ampersand accent | Ampersand Rust | `#A65D4A` | Acento hover, links |
| Story-tipo text | Navy | `#2C435B` | Texto body |
| Story-tipo borders | Rust Red | `#A5423A` | Bordes, separadores |
| Mancha roja | Brick Red | `#B2473D` | Danger |
| Parchment bg | `#F2EBE1` | Card backgrounds |
| Cream paper | `#F7F3E9` | Fondo principal |
| White bg | `#FFFFFF` | Fondo limpio |
| Foxing spots | `#A67B5B` | Muted accents |

## Mapeo CSS Variables → Logo Colors

### `:root` (LIGHT THEME) — ANTES vs DESPUÉS

| Variable | Antes (roto) | Después (logo) | Nota |
|----------|-------------|-----------------|------|
| `--bg-primary` | `#F4ECE4` | `#F7F3E9` | Cream paper del fondo-story |
| `--bg-card` | `#F7F3E9` | `#FFFFFF` | White como los logos |
| `--bg-input` | `#F2EBE1` | `#F2EBE1` | Parchment (sin cambio) |
| `--bg-hover` | `rgba(244,236,228,0.08)` | `rgba(44,67,91,0.06)` | Hover sobre slate-blue |
| `--text-primary` | `#0D1015` | `#34495E` | **Slate Blue del logo** |
| `--text-secondary` | `#3C4C5C` | `#4A6274` | **Slate blue-grey del logo 2** |
| `--text-muted` | `#546275` | `#6B7B8D` | Muted |
| `--border-default` | `rgba(160,82,45,0.2)` | `rgba(154,67,53,0.2)` | Rust border del logo |
| `--border-light` | `rgba(60,76,92,0.15)` | `rgba(44,67,91,0.15)` | Navy border |
| `--shadow-sm` | `rgba(0,0,0,0.4)` | `rgba(52,73,94,0.08)` | Sombra slate-blue |
| `--shadow-md` | `rgba(0,0,0,0.6)` | `rgba(52,73,94,0.16)` | Sombra slate-blue |
| `--accent-primary` | `#8C4434` | `#9A4335` | **Rust del logo K backdrop** |
| `--color-accent` | `#8C4434` | `#9A4335` | Rust del logo |
| `--color-success` | `#5C7A4D` | `#5C7A4D` | Sin cambio |
| `--color-warning` | `#E48C04` | `#E48C04` | Sin cambio |
| `--color-danger` | `#B24D42` | `#B2473D` | **Brick red del logo** |
| `--color-info` | `#2C435B` | `#2C435B` | Navy sin cambio |
| `--badge-bg` | `rgba(140,68,52,0.15)` | `rgba(154,67,53,0.12)` | Rust badge |
| `--chart-grid` | `#3C4C5C` | `#4A6274` | Slate blue-grey |
| `--chart-text` | `#6B7B8D` | `#6B7B8D` | Sin cambio |
| `--chart-tooltip-bg` | `#F7F3E9` | `#FFFFFF` | White |
| `--chart-tooltip-border` | `rgba(160,82,45,0.2)` | `rgba(154,67,53,0.2)` | Rust |

### `@theme inline` — A&K Brand Tokens (light overrides)

| Variable | Antes (solo dark) | Después (dual) |
|----------|-------------------|----------------|
| `--color-ak-madera` | `#0D1015` (negro!) | Light: `#34495E` (slate-blue), Dark: `#9BA8B7` (steel) |
| `--color-ak-cal` | `#F4ECE4` | Light: `#34495E` (logo text), Dark: `#F4ECE4` (cream) |
| `--color-ak-borgona` | `#8C4434` | Light: `#9A4335` (logo rust), Dark: `#8C4434` |
| `--color-ak-ladrillo` | `#A0522D` | Light: `#A65D4A` (logo ampersand), Dark: `#A0522D` |

### Componentes Específicos

1. **AdminHeader / HostHeader**: Eliminar inline styles, usar CSS vars
   - Light: `bg-white/95` + `text-[var(--text-primary)]` (slate-blue)
   - Dark: `bg-[var(--color-ak-night)]/95` + `text-[var(--color-ak-cal)]` (cream)

2. **Navbar (home)**: Ya forzado dark — sin cambios

3. **HeroSection**: Ya forzado dark — sin cambios

4. **Footer**: Ya forzado dark — sin cambios

5. **Logo**: Light theme = slate-blue `#34495E`, Dark theme = cream `#F4ECE4`
   - `text-[var(--color-ak-cal)]` ya funciona (se swap en dark)

## Archivos a Modificar

1. `src/app/globals.css` — CSS variables en `:root` y `@theme inline`
2. `src/components/admin/AdminHeader.tsx` — Eliminar inline styles, usar CSS vars
3. `src/components/host/HostHeader.tsx` — Eliminar inline styles, usar CSS vars
4. `src/components/layout/Navbar.tsx` — Logo text con CSS var
5. `src/components/home/HeroSection.tsx` — Sin cambios (dark-first)
6. `src/components/layout/Footer.tsx` — Sin cambios (dark-first)

## Principio Clave

Los logos tienen **fondo blanco** con **texto slate-blue** y **acentos rust/terracotta**.
En light theme, la app debe verse como los logos: fondo crema/blanco, texto azul pizarra,
acentos terracotta. En dark theme, se usan los colores de los flyers: fondo negro,
texto crema, acentos rust/ámbar.

NUNCA mezclar paletas: slate-blue SOLO en light, cream SOLO en dark.