# useCustomers.ts

- **Que hace**: Paginated, filterable, segmented customer list. Includes segment counts, quick filters, and abort on re-fetch.
- **Datos**: GET `/api/admin/customers` (with pagination, sorting, filters); GET `/api/admin/customers/segment-counts`
- **Returns**: `{ customers, total, totalPages, currentPage, loading, error, segmentCounts, activeSegment, quickFilters, perPage, applyFilters, goToPage, setActiveSegment, setQuickFilters, setPerPage }`
- **Pitfalls**: Segment visits ranges map: nuevos=1-1, ocasional=2-3, frecuente=4-5, habitual=6-10, vip=11+; aborts in-flight requests on new fetch