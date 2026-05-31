# useCustomerAnalytics.ts

- **Que hace**: Fetches customer analytics overview (segments, no-show risk, reactivation) and retention data separately
- **Datos**: GET `/api/admin/customers/analytics?view=overview` and `?view=retention`
- **Returns**: `{ overview, retention, loading, error, refetch }` — overview is AnalyticsOverview type
- **Pitfalls**: Two parallel fetches; refetch only refreshes overview, not retention