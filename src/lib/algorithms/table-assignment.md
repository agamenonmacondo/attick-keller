# table-assignment.ts

- **Que hace**: Core algorithm for assigning tables to reservations. Scores candidates by capacity fit, zone preference, urgency, and combinations. Returns ranked suggestions.
- **Exports**: `AssignmentResult`, `ScoredCandidate`, `assignTable()` and related types/functions
- **Datos**: Pure function — no API calls; receives table inventory and reservation as input
- **Pitfalls**: See PLAN-ALGORITMO.md for full algorithm design; zone letters use zone-letter.ts fallback