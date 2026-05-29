# usePrefersReducedMotion.ts

- **Que hace**: React hook that detects `prefers-reduced-motion: reduce` OS setting and listens for changes
- **Returns**: `boolean` — true if user prefers reduced motion
- **Pitfalls**: None; simple MediaQueryList listener, SSR-safe (initial false)