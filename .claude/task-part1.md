# Task: Create API Routes for Table Inventory Management

## Context
You are working on the Attick & Keller restaurant admin app (Next.js 16, React 19, TypeScript, Supabase).

## Database Schema (Supabase)

### tables
- id (uuid, PK)
- restaurant_id (uuid, FK)
- zone_id (uuid, FK -> table_zones)
- number (text) — e.g. "1A", "2B", "1E"
- capacity (integer) — max capacity
- capacity_min (integer) — min capacity
- name_attick (text) — display name e.g. "Sala 1", "Jardín 3"
- can_combine (boolean)
- combine_group (text, nullable) — e.g. "taller_combine", "jardin_combine"
- is_active (boolean)
- sort_order (integer)
- created_at (timestamp)

### table_zones
- id (uuid, PK)
- restaurant_id (uuid, FK)
- name (text) — e.g. "Taller", "Tipi", "Jardin", "Chispas", "Attic"
- description (text, nullable)
- sort_order (integer)

### table_combinations
- id (uuid, PK)
- restaurant_id (uuid, FK)
- table_ids (array of uuids)
- combined_capacity (integer)
- is_active (boolean)

## Existing Patterns

### Auth Pattern (from admin-auth.ts)
```typescript
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
// getAdminUser(request) → AdminUser | null (only store_admin or super_admin)
// getServiceClient() → Supabase client with service_role
// RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'
```

### Existing zones route (read-only):
```typescript
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sb = getServiceClient()
  const { data, error } = await sb.from('table_zones').select('id, name').eq('restaurant_id', RESTAURANT_ID).order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ zones: data || [] })
}
```

## Files to Create

### 1. `/src/app/api/admin/inventory/zones/route.ts`
- GET: list all zones (same pattern as existing, but include description and sort_order)
- POST: create new zone (name, description, sort_order) — admin only
- PATCH: update zone (id, name?, description?, sort_order?) — admin only
- DELETE: delete zone by id — admin only. Must check no active tables in zone first.

### 2. `/src/app/api/admin/inventory/tables/route.ts`
- GET: list all tables with zone info — admin only
- PATCH: batch update tables (array of {id, ...fields}) — admin only

### 3. `/src/app/api/admin/inventory/tables/[id]/route.ts`
- PATCH: update single table (toggle is_active, change capacity, zone_id, etc.) — admin only
- DELETE: delete table by id — admin only

### 4. `/src/app/api/admin/inventory/combinations/route.ts`
- GET: list all combinations — admin only
- POST: create combination (table_ids, combined_capacity) — admin only
- PATCH: update combination (id, table_ids?, combined_capacity?, is_active?) — admin only
- DELETE: delete combination by id — admin only

## Tests to Create

### `/src/app/api/admin/inventory/__tests__/zones.test.ts`
- Test GET returns zones list
- Test POST creates a zone (mock auth as admin)
- Test PATCH updates a zone
- Test DELETE removes a zone
- Test DELETE with tables in zone returns error

### `/src/app/api/admin/inventory/__tests__/tables.test.ts`
- Test GET returns tables with zone info
- Test PATCH toggles is_active on a table
- Test PATCH updates capacity and name_attick
- Test DELETE removes a table

## Rules
- Follow existing patterns exactly (auth, error handling, RESTAURANT_ID constant)
- Use `getAdminUser` for auth (only store_admin/super_admin can modify)
- Use `getServiceClient()` for Supabase operations
- Return proper HTTP status codes (200, 201, 400, 403, 500)
- Include proper TypeScript types
- For tests, mock `@/lib/utils/admin-auth` to simulate authenticated/unauthenticated requests
- Mock Supabase client in tests
- All tests must pass with `npx vitest run`

Run `npx vitest run src/app/api/admin/inventory/__tests__/` after creating all files to verify tests pass.