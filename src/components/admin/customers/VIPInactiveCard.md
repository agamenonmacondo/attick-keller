# VIPInactiveCard.tsx

- **Que hace**: Tarjeta mostrando clientes VIP inactivos en los ultimos N dias con lista, botones de contacto rapido (WhatsApp) y alerta
- **Datos**: Hook `useVIPInactive` con parametro `days` (default 30); API `/api/admin/vip-inactive`
- **Dependencias**: AnimatedCard
- **Pitfalls**: Dias hardcodeado a 30 en la llamada al hook — podria necesitar parametrizacion si se quiere cambiar el rango