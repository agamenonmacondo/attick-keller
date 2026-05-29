# useDatesWithReservations.ts

- **Que hace**: Fetches dates that have reservations (for calendar dot indicators) within a range around a center date
- **Datos**: GET `/api/admin/dates-with-reservations?center=&range=`
- **Returns**: `{ dates, days, loading }` — dates is string[], days is Record<string, number>
- **Pitfalls**: Silent error handling (dots are non-critical UI); default range is 45 days