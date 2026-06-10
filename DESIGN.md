# Attick & Keller — Design

## Style Prompt
Rústico Editorial Moderno — a warm, intimate restaurant reservation experience. Mediterranean warmth meets editorial sophistication. Asymmetric layouts with hand-drawn accents. Not corporate, not minimal. Think candlelit bookshop meets craft brewery.

## Colors
- **Madera** #3E2723 → #A07868 dark — primary text, deep warm brown
- **Borgoña** #6B2737 → #C44D63 dark — primary accent (buttons, links, highlights)
- **Cal** #F5EDE0 — background, warm cream (same in both themes)
- **Oliva** #5C7A4D → #7BA86A dark — secondary accent (success, confirmation)
- **Ámbar** #D4922A → #E8A840 dark — tertiary accent (dates, highlights)
- **Dorado** #C9A94E — luxury accents, borders (same in both themes)
- **Ladrillo** #A0522D → #D4714D dark — warm secondary
- **Carbon** #1E1E1E — deep text

### Dark mode
Los colores de marca cambian automáticamente via CSS vars en `.dark {}`. Un solo `text-[var(--color-ak-borgona)]` funciona en ambos temas — no se necesitan `dark:` variants para brand colors.

### Structural colors (siempre CSS vars)
- `--bg-primary` light #F5EDE0 → dark #1A1412
- `--bg-card` light #FFFFFF → dark #2C2018
- `--bg-input` light #F5EDE0 → dark #362A22
- `--text-primary` light #3E2723 → dark #E8DDD0
- `--text-secondary` light #8D6E63 → dark #BCA898
- `--text-muted` light #A1887F → dark #9A8A7E
- `--border-default` light #D7CCC8 → dark #5A4A3E
- `--color-success` light #5C7A4D → dark #7BA86A
- `--color-warning` light #D4922A → dark #E8A840
- `--color-danger` light #C62828 → dark #EF5350

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
- No pure white backgrounds — always tinted warm (#F5EDE0)
- No sharp geometric motion — use organic, spring-based
- No corporate blue/purple gradients
- No centered symmetry — prefer asymmetric balance
- No cold/sterile typography — Playfair warmth mandatory
- No inline hex colors for brand — use CSS vars so dark mode works