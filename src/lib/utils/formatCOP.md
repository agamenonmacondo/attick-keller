# formatCOP.ts

- **Que hace**: Formatea numeros como pesos colombianos (COP) con Intl.NumberFormat
- **Datos**: Exporta formatCOP(value),formatCOPShort(value)
- **Dependencias**: Usado por dashboard POS, nomina, costos
- **Pitfalls**: No incluye "$" para inputs — usar formatCurrency para display visual
