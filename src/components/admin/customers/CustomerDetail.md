# CustomerDetail.tsx

- **Que hace**: Panel lateral con detalle completo de un cliente: datos editables, tags, estadisticas, historial de visitas/reservas, notas y acciones de contacto
- **Datos**: Recibe `data` con customer, stats, visits, reservations; hook `useCustomerTags`; PATCH `/api/admin/customers/[id]` para guardar ediciones
- **Dependencias**: ContactActions, VisitHistory, CustomerNotes, TierBadge, SectionHeading
- **Pitfalls**: El modo edicion guarda `full_name`, `phone`, `email` via PATCH separado de tags; `assignedTagIds` se inicializa solo en mount y no se resincroniza si props cambian