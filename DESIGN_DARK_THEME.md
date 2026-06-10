# Attick & Keller — Dark Theme Spec

## How it works
Los colores de marca cambian automáticamente via CSS vars en `.dark {}`. Un solo `text-[var(--color-ak-borgona)]` funciona en ambos temas — no se necesitan `dark:` variants para brand colors.

### Brand colors (auto-switch)

| Color | Light | Dark | Contrast on dark bg |
|-------|-------|------|---------------------|
| Borgoña | #6B2737 | #C44D63 | 5.4:1 AA |
| Madera | #3E2723 | #A07868 | 4.5:1 AA |
| Oliva | #5C7A4D | #7BA86A | 5.0:1 AA |
| Ámbar | #D4922A | #E8A840 | 5.2:1 AA |
| Ladrillo | #A0522D | #D4714D | 4.8:1 AA |
| Cal | #F5EDE0 | #F5EDE0 | 12.8:1 AAA |
| Dorado | #C9A94E | #C9A94E | 7.5:1 AA |

### Structural colors (auto-switch)

| Token | Light | Dark |
|-------|-------|------|
| --bg-primary | #F5EDE0 | #1A1412 |
| --bg-card | #FFFFFF | #2C2018 |
| --bg-input | #F5EDE0 | #362A22 |
| --bg-hover | rgba warm | rgba light 8% |
| --text-primary | #3E2723 | #E8DDD0 |
| --text-secondary | #8D6E63 | #BCA898 |
| --text-muted | #A1887F | #9A8A7E |
| --border-default | #D7CCC8 | #5A4A3E |
| --border-light | #E8DDD0 | #4A3E34 |
| --color-success | #5C7A4D | #7BA86A |
| --color-warning | #D4922A | #E8A840 |
| --color-danger | #C62828 | #EF5350 |

### -light aliases (backward compat)

| Token | Value | Note |
|-------|-------|------|
| --color-ak-borgona-light | #C44D63 | Same as borgona in dark |
| --color-ak-oliva-light | #7BA86A | Same as oliva in dark |
| --color-ak-ambar-light | #E8A840 | Same as ambar in dark |

`dark:bg-[var(--color-ak-borgona-light)]` = redundante pero inofensivo. En dark, `var(--color-ak-borgona)` = `var(--color-ak-borgona-light)` = #C44D63.

## Warm overlay pattern (Host & Admin cards)

Cards en dark mode usan tintes cálidos semi-transparentes, no fondos planos:

- **Cards**: `bg-[var(--bg-card)] dark:bg-[var(--color-ak-madera-light)]/10`
- **Borders**: `border-[var(--border-default)] dark:border-[var(--color-ak-madera-light)]/15`
- **Brand-bordered**: `border-[var(--color-ak-borgona)]/20 dark:border-[var(--color-ak-borgona-light)]/20`
- **Active buttons**: `bg-[var(--color-ak-borgona)] dark:bg-[var(--color-ak-borgona-light)]`
- **Inactive buttons**: `bg-[var(--bg-secondary)] dark:bg-[var(--color-ak-madera-light)]/10`
- **Warm tints**: `bg-[var(--color-ak-borgona)]/5 dark:bg-[var(--color-ak-borgona-light)]/5`
- **Headers**: `bg-[var(--color-ak-madera)]/95 dark:bg-[var(--color-ak-madera-light)]/30`

## Generic Tailwind overrides (globals.css)

`.dark {}` mapea colores genéricos de Tailwind a la paleta warm:
- `bg-white` → `var(--bg-card)` (#2C2018)
- `text-gray-300/400/500` → `var(--text-secondary/muted)`
- `bg-gray-50→900` → `var(--bg-primary/card/input/etc)`
- `border-gray-*` → warm border vars
- `text/bg red/emerald/amber` → semantic danger/success/warning vars

Estos overrides arreglan 50+ componentes sin tocarlos individualmente.