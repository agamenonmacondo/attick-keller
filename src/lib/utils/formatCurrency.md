# formatCurrency.ts

- **Que hace**: Variantes de formato monetario para display (con $, sin decimales, compacto)
- **Datos**: Exporta formatCurrency, formatCurrencyShort
- **Dependencias**: Usado por componentes de UI que muestran precios/costos
- **Pitfalls**: Usa Intl.NumberFormat con locale 'es-CO' — testear en otros locales
