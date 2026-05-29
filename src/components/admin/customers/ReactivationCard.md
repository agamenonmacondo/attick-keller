# ReactivationCard.tsx

- **Que hace**: Tarjeta de reactivacion mostrando clientes dormidos, alcanzables por WhatsApp/email y no alcanzables, con acciones rapidas de contacto masivo y modal de detalle
- **Datos**: Recibe contadores (dormantClients, reachableWhatsApp, reachableEmail, notReachable) via props del analytics overview
- **Dependencias**: AnimatedCard
- **Pitfalls**: El copiado de WhatsApp redirige a `wa.me/57...` asumiendo codigo Colombia; el modal "Ver detalle" muestra breakdown pero las acciones reales dependen del componente padre