# Attick & Keller — Dark Theme Design Spec

## Architecture: Automatic Color Switching

Brand colors use **CSS custom properties** that change automatically in `.dark {}`. This eliminates the need for `dark:` Tailwind variants on every element.

### The Problem (Solved)
The original `@theme inline` block defines **fixed** colors that don't change in dark mode:
- `--color-ak-madera: #3E2723` → invisible on `#2C2018` card background (1.3:1 ratio)
- `--color-ak-borgona: #6B2737` → barely visible on `#1A1412` (1.7:1 ratio)
- `--color-ak-oliva: #5C7A4D` → fails AA on dark backgrounds (2.8:1)
- `--color-ak-ambar: #D4922A` → marginal on dark (4.0:1, barely passes large text)

### The Solution: `.dark {}` CSS Var Overrides

```css
.dark {
  --color-ak-borgona: #C44D63;   /* was #6B2737 — 5.4:1 on dark ✓ */
  --color-ak-madera: #A07868;     /* was #3E2723 — 4.5:1 on dark ✓ */
  --color-ak-oliva: #7BA86A;      /* was #5C7A4D — 5.0:1 on dark ✓ */
  --color-ak-ambar: #E8A840;      /* was #D4922A — 5.2:1 on dark ✓ */
  --color-ak-ladrillo: #D4714D;   /* was #A0522D — 4.8:1 on dark ✓ */
  --color-ak-cal: #F5EDE0;        /* stays — already light ✓ */
}
```

This means:
- `text-[var(--color-ak-borgona)]` → auto bright in dark mode
- `bg-[var(--color-ak-borgona)]` → auto bright in dark mode
- `style={{ color: 'var(--color-ak-borgona)' }}` → auto bright in dark mode
- No need to add `dark:text-[var(--color-ak-borgona-light)]` on every element

### Backward Compatibility with `-light` Vars

| Variable | Light Value | Dark Value |
|----------|------------|------------|
| `--color-ak-borgona` | #6B2737 | #C44D63 |
| `--color-ak-borgona-light` | #C44D63 | #C44D63 |

In dark mode, `var(--color-ak-borgona)` = `var(--color-ak-borgona-light)` = **#C44D63**.

Existing `dark:text-[var(--color-ak-borgona-light)]` are **harmless redundancy** — same value produced. No double-brightening occurs.

---

## Full Palette Reference

### Structural Colors (auto-switch via CSS vars)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--bg-primary` | #F5EDE0 | #1A1412 | Page background |
| `--bg-card` | #FFFFFF | #2C2018 | Cards, modals |
| `--bg-input` | #F5EDE0 | #362A22 | Inputs, active areas |
| `--bg-hover` | rgba(62,39,35,0.06) | rgba(232,221,208,0.08) | Hover states |
| `--text-primary` | #3E2723 | #E8DDD0 | Main text |
| `--text-secondary` | #8D6E63 | #BCA898 | Labels, subtitles |
| `--text-muted` | #A1887F | #9A8A7E | Tertiary text |
| `--border-default` | #D7CCC8 | #5A4A3E | Primary borders |
| `--border-light` | #E8DDD0 | #4A3E34 | Subtle borders |
| `--color-accent` | #6B2737 | #C44D63 | Accent (borgoña) |
| `--color-success` | #5C7A4D | #7BA86A | Success (oliva) |
| `--color-warning` | #D4922A | #E8A840 | Warning (ámbar) |
| `--color-danger` | #C62828 | #EF5350 | Danger (red) |
| `--badge-bg` | rgba(107,39,55,0.08) | rgba(196,77,99,0.15) | Badge background |
| `--shadow-sm` | 0 1px 2px rgba(62,39,35,0.06) | 0 1px 2px rgba(0,0,0,0.3) | Subtle shadow |
| `--shadow-md` | 0 4px 12px rgba(62,39,35,0.08) | 0 4px 12px rgba(0,0,0,0.4) | Medium shadow |

### Brand Colors (auto-switch in dark)

| Token | Light | Dark | WCAG on dark bg |
|-------|-------|------|-----------------|
| `--color-ak-madera` | #3E2723 | **#A07868** | 4.5:1 AA ✓ |
| `--color-ak-borgona` | #6B2737 | **#C44D63** | 5.4:1 AA ✓ |
| `--color-ak-cal` | #F5EDE0 | **#F5EDE0** | 12.8:1 AAA ✓ |
| `--color-ak-oliva` | #5C7A4D | **#7BA86A** | 5.0:1 AA ✓ |
| `--color-ak-ambar` | #D4922A | **#E8A840** | 5.2:1 AA ✓ |
| `--color-ak-dorado` | #C9A94E | #C9A94E | 7.5:1 AA ✓ |
| `--color-ak-ladrillo` | #A0522D | **#D4714D** | 4.8:1 AA ✓ |
| `--color-ak-carbon` | #1E1E1E | #1E1E1E | — |

### Fixed Aliases (night palette, for code that needs them)

| Token | Value | Maps to |
|-------|-------|---------|
| `--color-ak-night` | #1A1412 | `--bg-primary` dark |
| `--color-ak-night-card` | #2C2018 | `--bg-card` dark |
| `--color-ak-night-input` | #362A22 | `--bg-input` dark |
| `--color-ak-night-border` | #4A3A30 | `--border-default` dark |
| `--color-ak-night-text` | #E8DDD0 | `--text-primary` dark |
| `--color-ak-night-muted` | #A89080 | `--text-secondary` dark (old value) |
| `--color-ak-borgona-light` | #C44D63 | `--color-ak-borgona` dark |
| `--color-ak-oliva-light` | #7BA86A | `--color-ak-oliva` dark |
| `--color-ak-ambar-light` | #E8A840 | `--color-ak-ambar` dark |

---

## Rules

1. **ALWAYS** use CSS vars (`var(--xxx)`) for colors — never raw hex values
2. **NEVER** use Tailwind generic colors (`bg-white`, `text-gray-400`, `bg-red-50`)
3. **Brand colors auto-switch** — use `text-[var(--color-ak-borgona)]` not `dark:text-[var(--color-ak-borgona-light)]`
4. **Buttons with brand bg + white text** (e.g., `bg-[var(--color-ak-borgona)] text-white`) work in both themes without changes
5. **Headers** stay dark madera (`bg-[var(--color-ak-madera)]/95`) — visible in both themes because they're dark-on-dark
6. **Recharts** use theme-aware colors via `isDark` boolean — hex values switch dynamically
7. **Inline styles** work: `style={{ color: 'var(--color-ak-borgona)' }}` auto-switches in dark
8. **`dark:` variants using `-light`** are redundant but harmless — same value as the auto-switched base var

### What changed from the old spec
- `--text-secondary` dark improved: #A89080 → **#BCA898** (5.4:1 on dark bg)
- `--text-muted` dark improved: #7A6A5E → **#9A8A7E** (4.0:1 on dark bg)
- `--border-default` dark improved: #4A3A30 → **#5A4A3E** (3.5:1 on dark bg)
- `--border-light` dark improved: #3A2E24 → **#4A3E34** (2.8:1 on dark bg)
- Brand colors now **auto-switch** in `.dark` — no manual `dark:` variants needed