# NoShowRiskCard.tsx

- **Que hace**: Tarjeta que muestra distribucion de riesgo no-show en 4 niveles (sin riesgo, bajo, medio, alto) con barras proporcionales y porcentajes
- **Datos**: Recibe `risk` (noRisk, lowRisk, medRisk, highRisk), `totalNoShows`, `totalClients` via props del analytics overview
- **Dependencias**: AnimatedCard
- **Pitfalls**: Los porcentajes se calculan sobre `total` (= suma de los 4 niveles), no sobre `totalClients` — puede no coincidir si hay clientes sin clasificar