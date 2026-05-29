# AnimatedCard.tsx

- **Que hace**: Wrapper de card con animacion fade-in + slide-up al montar, con delay configurable y hover opcional
- **Datos**: Props children, delay (segundos), className, hover (boolean)
- **Dependencias**: Ninguna (puro CSS transitions)
- **Pitfalls**: Usa setTimeout para delay — no se re-dispara si el componente se re-mounta; hover agrega translate en eje Y
