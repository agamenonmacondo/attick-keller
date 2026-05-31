# CustomersPanel.tsx

- **Que hace**: Panel raiz del CRM de clientes — orquesta vista analitica vs lista, detalle lateral, seleccion multiple y compositor de campanas
- **Datos**: Hook `useCustomers` (API `/api/admin/customers`), `useCustomerDetail` (`/api/admin/customers/[id]`), `useCustomerTags` (`/api/admin/customer-tags`)
- **Dependencias**: CustomerFilters, CustomerList, CampaignComposer, CustomerDetail, CustomerAnalyticsPanel, SegmentTabs, QuickFilterChips
- **Pitfalls**: El estado `selectingAll` y `selectedIds` se desincronizan si se cambia de pagina sin limpiar seleccion; el rightPanel cambia entre composer/detail/empty basado en `selectedIds.size > 0`