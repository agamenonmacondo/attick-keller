# CampaignComposer.tsx

- **Que hace**: Compositor de campanas email para clientes seleccionados o filtrados: asunto, HTML body, preview y envio masivo
- **Datos**: Recibe filtros (tagIds, hasEmail, minVisits, lastVisitDays) y callback `onSend`; no consume APIs directamente
- **Dependencias**: framer-motion, Phosphor icons
- **Pitfalls**: `filterHasEmail` fuerza a true cuando se envia por email — si es false, el backend aun recibe el filtro pero no encontrara destinatarios