# Attick & Keller — Design

## Style Prompt
Rústico Editorial Moderno — a warm, intimate restaurant reservation experience. Mediterranean warmth meets editorial sophistication. Asymmetric layouts with hand-drawn accents. Not corporate, not minimal. Think candlelit bookshop meets craft brewery.

## Colors
- **Madera** #3E2723 — primary text, deep warm brown
- **Borgoña** #6B2737 — primary accent (buttons, links, highlights)
- **Cal** #F5EDE0 — background, warm cream
- **Oliva** #5C7A4D — secondary accent (success, confirmation)
- **Ámbar** #D4922A — tertiary accent (dates, highlights)
- **Negro** #1E1E1E — deep text
- **Dorado** #C9A94E — luxury accents, borders
- **Terracota** #A0522D — warm secondary

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