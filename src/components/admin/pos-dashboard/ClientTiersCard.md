# ClientTiersCard.tsx

- **Que hace**: Badges de tiers de clientes (VIP, Oro, Plata, Bronce) con count y totalSpent
- **Datos**: Array de `{tier, count, totalSpent}` desde cliente CRM
- **Dependencias**: `SectionHeading`, `formatCOPDisplay`, Phosphor `Crown`/`Medal`
- **Pitfalls**: Tiers no reconocidos usan fallback `var(--text-secondary)`; solo 4 tiers estilizados
