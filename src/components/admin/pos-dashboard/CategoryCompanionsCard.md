# CategoryCompanionsCard.tsx

- **Que hace**: Tabla de pares de categorías que se piden en el mismo cheque (top 15)
- **Datos**: Recibe `data` con `cat1Id`, `cat2Id`, `sharedCheques` — desde `usePOSDashboard`
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`
- **Pitfalls**: Sin datos muestra placeholder; pares pueden tener duplicados (A+B y B+A)
