# usePOSCosts.ts

- **Que hace**: Fetches POS cost analytics (purchases by day/month/category/supplier, product margins). AbortController for race conditions.
- **Datos**: GET `/api/admin/pos-costs?from=&to=`
- **Returns**: `{ data, loading, error, refetch }` — data typed as POSCostsData; exports POSCostsFilters type
- **Pitfalls**: Cache-busting `_t` param; aborts previous request on filter change