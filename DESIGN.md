# Attick & Keller — Design System

## Style Prompt
Rústico Editorial Moderno — a warm, intimate restaurant reservation experience. Mediterranean warmth meets editorial sophistication. Asymmetric layouts with hand-drawn accents. Not corporate, not minimal. Think candlelit bookshop meets craft brewery.

## Dual-Theme Architecture

Brand colors use **CSS custom properties** that automatically change in dark mode via `.dark {}` overrides. This means **one Tailwind class works in both themes** — no `dark:` variants needed for brand colors.

### How it works
- `text-[var(--color-ak-borgona)]` → `#6B2737` in light, `#C44D63` in dark (automatic)
- `bg-[var(--color-ak-borgona)]` → same behavior
- `style={{ color: 'var(--color-ak-borgona)' }}` → same behavior (inline styles also work)
- No `dark:text-[var(--color-ak-borgona-light)]` needed — the base var already changes

### Structural colors (always use CSS vars)
- Backgrounds: `--bg-primary`, `--bg-card`, `--bg-input`, `--bg-hover`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-default`, `--border-light`
- Semantic: `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`

## Colors — Light Theme

| Token | Hex | Use |
|-------|-----|-----|
| `--color-ak-madera` | #3E2723 | Primary text, deep warm brown |
| `--color-ak-borgona` | #6B2737 | Primary accent (buttons, links) |
| `--color-ak-cal` | #F5EDE0 | Background, warm cream |
| `--color-ak-oliva` | #5C7A4D | Secondary accent (success, confirmation) |
| `--color-ak-ambar` | #D4922A | Tertiary accent (dates, highlights) |
| `--color-ak-dorado` | #C9A94E | Luxury accents, borders |
| `--color-ak-ladrillo` | #A0522D | Warm secondary |
| `--color-ak-carbon` | #1E1E1E | Deep text |

## Colors — Dark Theme Overrides

In `.dark {}`, these vars **automatically** change to their lighter variants:

| Token | Light | Dark | Ratio on dark bg |
|-------|-------|------|------------------|
| `--color-ak-borgona` | #6B2737 | **#C44D63** | 5.4:1 AA |
| `--color-ak-madera` | #3E2723 | **#A07868** | 4.5:1 AA |
| `--color-ak-oliva` | #5C7A4D | **#7BA86A** | 5.0:1 AA |
| `--color-ak-ambar` | #D4922A | **#E8A840** | 5.2:1 AA |
| `--color-ak-ladrillo` | #A0522D | **#D4714D** | 4.8:1 AA |
| `--color-ak-cal` | #F5EDE0 | **#F5EDE0** | 12.8:1 AAA |
| `--color-ak-dorado` | #C9A94E | #C9A94E | 7.5:1 AA |

### Dark semantic vars (also auto-switch)

| Token | Light | Dark |
|-------|-------|------|
| `--bg-primary` | #F5EDE0 | #1A1412 |
| `--bg-card` | #FFFFFF | #2C2018 |
| `--bg-input` | #F5EDE0 | #362A22 |
| `--text-primary` | #3E2723 | #E8DDD0 |
| `--text-secondary` | #8D6E63 | #BCA898 |
| `--text-muted` | #A1887F | #9A8A7E |
| `--border-default` | #D7CCC8 | #5A4A3E |
| `--border-light` | #E8DDD0 | #4A3E34 |
| `--color-accent` | #6B2737 | #C44D63 |
| `--color-success` | #5C7A4D | #7BA86A |
| `--color-warning` | #D4922A | #E8A840 |
| `--color-danger` | #C62828 | #EF5350 |

### -light aliases (for backward compat with `dark:` variants)

| Token | Value | Note |
|-------|-------|------|
| `--color-ak-borgona-light` | #C44D63 | Same as borgona in dark |
| `--color-ak-oliva-light` | #7BA86A | Same as oliva in dark |
| `--color-ak-ambar-light` | #E8A840 | Same as ambar in dark |

**In dark mode, `var(--color-ak-borgona)` = `var(--color-ak-borgona-light)` = #C44D63.** Existing `dark:` variants using `-light` are harmless redundancy, not double-brightening.

## Typography
- **Playfair Display** — headings, display text, titles
- **DM Sans** — body text, UI elements
- **Caveat** — hand-drawn accents, casual notes

## Motion
- Spring physics (stiffness: 100, damping: 20)
- Custom easing: cubic-bezier(0.23, 1, 0.32, 1)
- Stagger reveals: 50-80ms between elements
- Scale buttons: 0.97 hover, spring back
- Clip-path image reveals
- Blur → focus orchestration

## What NOT to Do
- No pure white backgrounds — always tinted warm (`var(--bg-card)` in light, `var(--bg-primary)` in dark)
- No sharp geometric motion — use organic, spring-based
- No corporate blue/purple gradients
- No centered symmetry — prefer asymmetric balance
- No cold/sterile typography — Playfair warmth mandatory
- No `dark:` Tailwind variants for brand colors — use CSS vars that auto-switch
- No inline `style={{ color: '#6B2737' }}` — use `style={{ color: 'var(--color-ak-borgona)' }}` so dark mode works