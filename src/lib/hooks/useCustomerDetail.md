# useCustomerDetail.ts

- **Que hace**: Fetches a single customer's detail (profile, stats, visits, reservations) with AbortController for race conditions
- **Datos**: GET `/api/admin/customers/:id`
- **Returns**: `{ data, loading, error, fetchCustomer, clear }` — call fetchCustomer(id) on demand
- **Pitfalls**: Aborts previous request if a new one comes in; call clear() to reset state when closing detail panel