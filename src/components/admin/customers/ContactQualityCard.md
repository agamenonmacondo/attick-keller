# ContactQualityCard.tsx

- **Que hace**: Tarjeta que muestra porcentajes de contactabilidad: celular, email, ambos y sin datos
- **Datos**: Recibe contadores (withPhone, withEmail, withBoth, withNeither, total) via props del analytics overview
- **Dependencias**: AnimatedCard
- **Pitfalls**: Los porcentajes se calculan sobre `total` que puede ser 0 — se protege con `(total > 0 ? ... : '0')`