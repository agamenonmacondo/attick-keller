# CLAUDE TASK: Host Panel v2 — Multi-Reservation UI + Urgency + Reassign

## Context
This is a Next.js 14 restaurant management app (Attick & Keller). The backend already returns multi-reservation data per table via the occupancy API. Your job is to update the FRONTEND components to use this new data.

## What's ALREADY DONE (DO NOT MODIFY):
- `src/lib/utils/time.ts` — time helpers (formatTimeColombia, diffMinutes, etc.)
- `src/lib/utils/urgency.ts` — computeUrgency(), classifyTime(), URGENCY_STYLES, getUrgencyBadge()
- `src/app/api/admin/occupancy/route.ts` — returns multi-reservation timeline per table
- `src/lib/hooks/useHostOccupancy.ts` — updated interface with ReservationTimeline, urgency_level, etc.
- `src/app/api/admin/floorplan/route.ts` — DO NOT TOUCH

## Read DESIGN-HOST-V2.md for full spec

## Key API Changes You Need to Know

The `occupancy` API now returns each table with:
```ts
interface TableItem {
  // ... existing fields ...
  reservations: ReservationTimeline[]  // ALL reservations tonight for this table
  current_reservation: ReservationTimeline | null  // happening NOW
  next_reservation: ReservationTimeline | null  // next upcoming
  urgency_level: 'urgent' | 'warning' | 'info' | 'none'
  zone_name: string | null
  reservation_status: string | null  // backward compat
}
```

```ts
interface ReservationTimeline {
  id: string
  status: 'pending' | 'confirmed' | 'pre_paid' | 'seated' | 'completed' | 'no_show' | 'cancelled'
  party_size: number
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  special_requests: string | null
  time_start: string  // "18:00"
  time_end: string    // "20:00"
  is_current: boolean
  is_past: boolean
  is_upcoming: boolean
}
```

The API also returns `current_time` (HH:MM Colombia time) at the top level.

## TASKS (in order of priority):

### 1. UPDATE `src/components/host/HostTableMap.tsx`

**Import the new types and utilities:**
- Import `ReservationTimeline` from `@/lib/hooks/useHostOccupancy`
- Import `computeUrgency`, `URGENCY_STYLES`, `getUrgencyBadge` from `@/lib/utils/urgency`
- Import `formatTimeColombia` from `@/lib/utils/time`

**Update TableItem interface** to include the new fields: reservations, current_reservation, next_reservation, urgency_level, zone_name, reservation_status.

**Update the card (HostTableCard):**

a) **Urgency visual system** — Replace the simple 3-color system with urgency-aware colors:
- available (green #5C7A4D) — no reservations
- reserved-far (amber #D4922A) — has upcoming reservation >60min
- info (blue #1565C0) — next reservation 31-60min, badge "1h"
- warning (orange #E65100) — next reservation 16-30min, badge "30m", subtle pulse
- urgent (red #C62828) — next reservation ≤15min, badge "15m", strong pulse animation
- occupied (burgundy #6B2737) — currently seated
- transition (purple #7B1FA2) — between reservations

b) **Mini-timeline bar** — Below the capacity line, show a horizontal bar representing the evening:
- Each reservation is a colored block proportional to its duration
- Current reservation filled solid, upcoming outlined
- "Now" marker as a thin vertical line

c) **Next reservation preview** — Below the mini-timeline:
```
⏳ 21:30 - María García (4p)
```
Only shown if there's an upcoming reservation and table is free or occupied.

**Update the popover (when table is clicked):**

The popover should now show a FULL TIMELINE of reservations for this table:

```
┌─────────────────────────────────────┐
│ Mesa 3B · Tipi (6 personas)    [✕] │
│                                     │
│ ── AHORA ───────────────────────── │
│ 🟢 Juan Pérez              6 personas│
│    7:30 p.m. – 9:30 p.m.  ● Confirmado│
│    📱 310 555 1234                    │
│    ✉️ juan@email.com                  │
│    📝 Alergia a mariscos              │
│                              [Sentados]│
│                                      │
│ ── PRÓXIMA (⚠ 30min) ───────────── │
│ 🟠 María García            4 personas │
│    9:30 p.m. – 11:00 p.m.  ● Confirmado│
│    📱 310 666 7890                    │
│                      [Reasignar] [Sentar]│
│                                      │
│ ── MÁS TARDE ────────────────────── │
│ ⏳ Carlos López             2 personas │
│    11:00 p.m. – 11:30 p.m.  ● Pre-pagado│
│                                      │
│ ── ACCIONES ─────────────────────── │
│ [+ Walk-in]  [Reasignar reserva]     │
└─────────────────────────────────────┘
```

Each reservation section should be expandable — initially show just name + time + people, click to expand and see phone (with WhatsApp icon link), email, special_requests.

**Status badges:**
- confirmed → green dot + "Confirmado"
- pre_paid → green dot + "Pre-pagado"  
- seated → green dot + "Sentados"
- pending → yellow dot + "Pendiente"
- no_show → red dot + "No asistió"
- cancelled → grey dot + "Cancelada"

**Actions per reservation:**
- If status is confirmed/pre_paid → "Sentar" button (PATCH status=seated)
- If status is seated → "Liberar" button (PATCH with table_id=null or status=completed)
- "Reasignar" button → opens ReassignModal
- Walk-in button at bottom → uses HostWalkInForm

### 2. CREATE `src/components/host/ReassignModal.tsx`

A modal that lets the admin move a reservation to a different table:

- Shows current reservation info (name, people, time, current table+zone)
- Fetches available tables from `/api/admin/occupancy` (reuse the data from useHostOccupancy)
- Filters tables by:
  - capacity >= reservation.party_size
  - No overlapping reservations (use reservations[] timeline to check time conflicts with 30min buffer)
  - Sorted by zone preference (same zone first, then by capacity match)
- Each table option shows: table name, zone, capacity, "Libre hasta XX:XX" if applicable
- Confirm button → PATCH `/api/admin/reservations/${id}` with `{ table_id: newTableId }`
- Cancel button
- Mobile-friendly (full-width on phone, centered modal on desktop)

### 3. CREATE `src/components/host/ReservationDetail.tsx`

A reusable expandable reservation detail component:

- Compact mode: name + time + people
- Expanded mode: adds phone (WhatsApp link), email, special_requests
- WhatsApp link: `https://wa.me/57{phone}` (strip leading 0/+, prepend 57 if not present)
- Smooth expand/collapse with framer-motion

### 4. UPDATE `src/components/host/HostShell.tsx`

- Pass `currentTime` from occupancyData to HostTableMap
- Import and render ReassignModal when triggered

### 5. UPDATE `src/components/host/HostWalkInForm.tsx`

- After entering # of people, show a dropdown of AVAILABLE tables
- Each option shows: "Mesa X · Zone (capacity) · Libre hasta XX:XX" when applicable
- Use the table's reservations[] timeline to compute "libre hasta"
- Pre-select the best table using the algorithm from useTableSuggestion

## STYLE GUIDELINES
- Use the existing color palette: burgundy #6B2737, amber #D4922A, brown #3E2723/#5D4037/#8D6E63, cream #F5EDE0
- Use @phosphor-icons/react for all icons (already installed)
- Use framer-motion for animations (already installed)
- Use `cn()` from `@/lib/utils/cn` for conditional classes
- Mobile-first responsive design
- All text in Spanish
- Pulse animation for urgent tables: `animate-pulse` from Tailwind

## IMPORTANT
- DO NOT modify any API routes
- DO NOT modify time.ts or urgency.ts (they're done)
- DO NOT modify useHostOccupancy.ts (it's done)
- Keep ALL existing functionality working (assignment, suggestions, unassign)
- The existing HostTableMap popover already has assign/unassign — integrate naturally with the new timeline
- Make sure the component compiles without TypeScript errors
- Run `npx tsc --noEmit` at the end to verify