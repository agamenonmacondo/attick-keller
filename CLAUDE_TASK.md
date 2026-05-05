# Task: Add table assignment info to reservation cards and table detail popover

## Context
Attick & Keller restaurant host panel. When a host taps a table bubble in the floor plan OR looks at a reservation card in the "Reservas" tab, they need to see which table is assigned and who is seated there.

## Problems to fix

### Problem 1: Reservation cards in "Reservas" tab don't show assigned table
**File:** `src/components/host/HostReservationQueue.tsx`

Currently on line 187-189 it shows:
```
{partySize} personas{r.zone_name ? ` · ${r.zone_name}` : ''}
```

But it does NOT show the table number (e.g. "Mesa 5E · Ático"). The `table_id` is available in the reservation data from the dashboard API, but we need `table_number` and `zone_name` to display it.

**Fix needed:**
1. The dashboard API (`src/app/api/admin/dashboard/route.ts`) currently returns reservations with `table_id` but NOT `table_number` or `zone_name`. Add a join to get `tables(number)` and `table_zones(name)` for each reservation's `table_id`.
2. In `HostReservationQueue.tsx`, add a line showing the table assignment: "Mesa 5E · Ático" using an `Armchair` or `Table` icon from phosphor-icons.

### Problem 2: Table popover in floor plan shows limited info
**File:** `src/components/admin/floorplan/FloorPlanMap.tsx`

The `TableDetailContent` component (lines 300-370) already shows:
- Zone, capacity, status
- `customer_name`, `time_range`, `party_size` IF the floorplan API provides them

**The floorplan API** (`src/app/api/admin/floorplan/route.ts`) already joins reservations and populates these fields. BUT it only matches one reservation per table via `tableReservationMap` which only keeps the LAST reservation for each table_id.

**Fix needed:**
1. In the floorplan API, for tables with a `confirmed` reservation, show the reservation info (name, time, party_size) — this is already implemented.
2. Add the reservation ID to the popover so the host can tap to open the full reservation detail.
3. Make sure the `customer_name` field properly extracts from the Supabase join (the current code at line 89 already does this).

### Problem 3: Dashboard API doesn't include table/zone info for reservations
**File:** `src/app/api/admin/dashboard/route.ts`

Line 15 currently selects:
```
'id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone)'
```

**Fix needed:** Add `tables(number, table_zones(name))` to the select so the frontend has table_number and zone_name for each reservation.

## Implementation Steps

1. **Dashboard API** (`src/app/api/admin/dashboard/route.ts` line 15):
   - Change the reservations select to include table info:
   ```
   'id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone), tables(id, number, table_zones(id, name))'
   ```
   - After fetching, flatten the data so each reservation has `table_number` and `zone_name` fields (extract from the nested join).

2. **Reservation Queue** (`src/components/host/HostReservationQueue.tsx`):
   - Import `Armchair` from `@phosphor-icons/react` (already available)
   - After line 186 (customerName), add table info:
   ```tsx
   {r.table_number && (
     <p className="text-xs text-[#5C7A4D] flex items-center gap-1">
       <Armchair size={12} />
       Mesa {r.table_number}{r.zone_name ? ` · ${r.zone_name}` : ''}
     </p>
   )}
   ```
   - Make sure `table_number` and `zone_name` are extracted from the reservation data.

3. **Verify floorplan popover works** — no code changes needed if the API already populates customer_name and time_range. Just ensure the mock reservations have proper table assignments.

## Important Notes
- The project uses `@phosphor-icons/react` for icons
- Color palette: primary `#6B2737`, secondary `#8D6E63`, accent green `#5C7A4D`
- The `Armchair` icon is already used on line 11 of HostReservationQueue
- Keep the UI style consistent: text-xs for secondary info, Playfair Display for headings
- Make sure TypeScript types are correct — reservations come as `Array<Record<string, unknown>>`
- After changes, run: `npx tsc --noEmit --project tsconfig.json` to verify
- Commit with descriptive message when done