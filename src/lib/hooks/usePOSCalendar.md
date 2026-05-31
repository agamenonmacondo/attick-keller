# usePOSCalendar.ts

- **Que hace**: Fetches daily POS revenue/trends for calendar view, filtered by zone. AbortController for race conditions.
- **Datos**: GET `/api/admin/pos-calendar?zone=`
- **Returns**: `{ dailyTrend, availableMonths, loading, error }` — exports CalendarDayData type
- **Pitfalls**: Cache-busting via `_t=${Date.now()}`; default zone='all'; aborts previous request on zone change