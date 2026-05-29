# AnimatedCounter.tsx

- **Que hace**: Animacion de conteo numerico con easing cubic ease-out (160ms), soporta reduced motion
- **Datos**: Props value (number), className
- **Dependencias**: cn, usePrefersReducedMotion
- **Pitfalls**: Si prefersReducedMotion=true salta directamente al valor final; no formatea COP (solo numeros enteros)
