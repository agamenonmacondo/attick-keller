# Attick & Keller — Design System

## Style Prompt

Rústico Editorial Moderno: Mediterranean warmth meets craft brewery. Warm, asymmetric, editorial. Think printed menu cards, wine-stained paper, handwritten marginalia. Never corporate, never cold, never geometric precision.

## Colors

| Token | Hex | Role |
|-------|-----|------|
| `--color-wood` | #3E2723 | Primary text, deep brown |
| `--color-wine` | #6B2737 | Primary accent, CTAs, links |
| `--color-cream` | #F5EDE0 | Backgrounds, never pure white |
| `--color-olive` | #5C7A4D | Secondary accent, success |
| `--color-amber` | #D4922A | Tertiary accent, dates, highlights |
| `--color-charcoal` | #1E1E1E | Deep text overlays |
| `--color-gold` | #C9A94E | Luxury accents |
| `--color-brick` | #A0522D | Warm secondary |

## Typography

- **Playfair Display** — headings, display text. Use 700 weight for titles, 400 for subtitles.
- **DM Sans** — body, labels, data. Use 400/500/700 weights.
- **Caveat** — hand-drawn accents only (never for body text).

## Motion

- Spring physics: stiffness 100, damping 20
- Stagger reveals: 50-80ms between siblings
- Easing: cubic-bezier(0.23, 1, 0.32, 1) for entrances, power2.in for exits
- Never: pure white backgrounds, sharp geometric motion, corporate blue/purple

## What NOT to Do

- Never use pure #FFFFFF as a background — always use #F5EDE0 cream
- Never use centered symmetry — prefer asymmetric, editorial layouts
- Never use cold/tech colors (blue, purple, neon)
- Never use sharp, linear motion — always spring or ease-out curves
- Never use Roboto, Inter, or system fonts