
TASK: Fix 4 bugs in the Attick & Keller reservation system.

PROJECT LOCATION: /mnt/f/attick-keller/web/

## Bug 1: Auto-confirm reservations (CRITICAL)
File: src/app/api/reservations/route.ts

CHANGE 1A — Line 275: Change status from 'pending' to 'confirmed':
  BEFORE: status: 'pending',
  AFTER:  status: 'confirmed',

CHANGE 1B — Line 283: Change the email status from 'pending' to 'confirmed':
  BEFORE: sendStatusEmail(sb, reservation.id, 'pending').catch(e => console.error('Email error:', e))
  AFTER:  sendStatusEmail(sb, reservation.id, 'confirmed').catch(e => console.error('Email error:', e))

CHANGE 1C — Line ~221: The reservation conflict check already uses .neq('status', 'cancelled') which correctly includes 'confirmed'. NO change needed there.

## Bug 2: Admin reservations should use algorithm (MEDIUM)
File: src/app/api/admin/reservations/route.ts

REPLACE the naive zone-based table lookup (lines ~55-67) with the same assignTable() algorithm used in the customer endpoint.

CURRENT CODE (lines ~55-67):
  let tableId: string | null = null
  if (zone_id) {
    const { data: zoneTables } = await sb
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .gte('capacity', party_size)
      .order('capacity', { ascending: true })
      .limit(1)
    if (zoneTables && zoneTables.length > 0) tableId = zoneTables[0].id
  }

REPLACE WITH: Use assignTable() from '@/lib/algorithms/table-assignment' with the same pattern as the customer endpoint. The algorithm takes: { reservation: { id, party_size, date, time_start, time_end }, available_tables, existing_reservations, combinations }. If no zone_id is provided, just use assignTable without zone preference. If zone_id IS provided, still use assignTable but pass a preferred zone.

IMPORTANT: Keep the rest of the file unchanged. The admin endpoint creates with status 'confirmed' which is already correct.

## Bug 3: Walk-in form uses UTC date instead of Colombia timezone (MEDIUM)
File: src/components/host/HostWalkInForm.tsx

CHANGE — Line 39: Replace UTC date with Colombia date:
  BEFORE: const date = now.toISOString().split('T')[0]
  AFTER:  const { getColombiaDate } = await import('@/lib/utils/date')
          const date = getColombiaDate()

IMPORTANT: Since this is inside an async function (handleSubmit), the dynamic import is fine. But getColombiaDate() is synchronous, so you can also import it at the top level:

Add at the top of the file (after other imports):
  import { getColombiaDate } from '@/lib/utils/date'

Then change line 39 to:
  const date = getColombiaDate()

## Bug 4: Host Quick Actions should still work with auto-confirm
File: src/components/host/HostShell.tsx

The "Confirmar siguiente" button currently finds reservations with status 'pending' and confirms them. With auto-confirm, there will be no more 'pending' reservations. This button's functionality changes:

CHANGE: The handleConfirmNext should now find the first 'confirmed' reservation without a table and assign it, OR we should repurpose the button.

Actually, let's keep the UI as-is for now. The "Confirmar siguiente" button can still exist — if an admin manually creates a reservation as 'pending' (via a future manual flow), it would work. The button itself won't break anything.

NO CHANGE NEEDED for Bug 4.

## IMPORTANT RULES:
- Do NOT change any other files
- Do NOT change the database schema
- Do NOT change any UI components other than HostWalkInForm.tsx
- Make sure to add imports where needed (getColombiaDate, assignTable)
- The assignTable import is: import { assignTable } from '@/lib/algorithms/table-assignment'
- getColombiaDate import is: import { getColombiaDate } from '@/lib/utils/date'
- Test that TypeScript compiles: npx tsc --noEmit --project tsconfig.json (from /mnt/f/attick-keller/web/)
