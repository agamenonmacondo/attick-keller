# Attick & Keller — Table Assignment Algorithm

## Context
This is a Mediterranean restaurant reservation system (Next.js 16 + Supabase + Tailwind v4). We're building an automatic table assignment algorithm.

## Architecture
- Next.js 16 App Router with TypeScript
- Supabase for DB, Auth, and Realtime
- Tailwind v4 for styling
- React 19 with hooks

## Key Files
- `src/lib/algorithms/table-assignment-sim.ts` — existing simulation (draft, not integrated)
- `src/lib/algorithms/PLAN-ALGORITMO.md` — full implementation plan
- `src/app/api/reservations/route.ts` — current reservation creation
- `src/app/api/admin/reservations/route.ts` — admin reservation creation
- `src/app/api/admin/occupancy/route.ts` — current occupancy endpoint
- `src/app/reservar/page.tsx` — public reservation wizard
- `src/lib/utils/serviceHours.ts` — hardcoded service hours
- `src/lib/hooks/useHostOccupancy.ts` — host occupancy hook
- `src/lib/types/inventory.ts` — inventory type definitions
- `src/components/host/HostTableMap.tsx` — host table map component

## DB Schema (after migration)
- 5 zones: Taller(A), Tipi(B), Jardín(C), Chispas(D), Ático(E)
- 45 tables with real capacities
- 39 table combinations
- 7 availability rows (one per day)

## Algorithm Rules
1. PROTECT combinable tables — NEVER assign couples (2pax) to can_combine=true tables
2. PRIORITIZE large groups (12→10→9→...→2) — they're 65% of revenue
3. COMBINE tables for groups of 4+ when no single table fits
4. RELEGATE small groups (2-3pax) to low-priority zones (Ático, Chispas)
5. ROUTE BY ARRIVAL TIME: early (18:00-19:00) → low zones; peak (20:00-21:00) → high zones

## Scoring Weights
- Capacity fit: 40%
- Zone priority: 30% (Tipi=100 > Taller=80 > Jardín=60 > Chispas=40 > Ático=20)
- Waste penalty: 20% (empty seats wasted)
- Combination bonus: 10% (using combinable tables as intended)

## Critical Constraint
NO TABLE ROTATION. Each table is used ONCE per night. Families stay 4-5h, groups 3-4h, couples 2-3h.