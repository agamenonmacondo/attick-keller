# Task: Create API Routes + Tests for Table Inventory Module

You are working on the Attick & Keller restaurant admin app. Create the following files using TDD approach (write tests FIRST, then implementation).

## Project Context
- **Project**: `/mnt/f/attick-keller/web/`
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind 4, Supabase
- **Testing**: Vitest (already configured at `vitest.config.ts`, smoke test passes)
- **Test setup**: `src/test/setup.ts` (mocks for next/navigation, next/server, framer-motion)
- **Auth pattern**: Use `getAdminUser(request)` and `getServiceClient()` from `@/lib/utils/admin-auth`, `RESTAURANT_ID` from `@/lib/utils/constants`
- **DB**: Supabase, service role key in `SUPABASE_SERVICE_ROLE_KEY` env var, URL in `NEXT_PUBLIC_SUPABASE_URL`

## DB Schema (existing tables)

### `table_zones`
- `id` (uuid, PK)
- `restaurant_id` (uuid, FK)
- `name` (text)
- `description` (text, nullable)
- `sort_order` (integer, default 0)
- `created_at` (timestamp)

### `tables`
- `id` (uuid, PK)
- `restaurant_id` (uuid, FK)
- `zone_id` (uuid, FK -> table_zones.id, nullable)
- `number` (text) — nomenclatura like "1A", "2B"
- `capacity` (integer)
- `capacity_min` (integer, minimum capacity)
- `name_attick` (text, nullable) — display name for Attick & Keller
- `is_active` (boolean, default true)
- `can_combine` (boolean, default false)
- `combine_group` (text, nullable) — group identifier for combinable tables
- `sort_order` (integer, default 0)
- `created_at` (timestamp)

### `table_combinations`
- `id` (uuid, PK)
- `restaurant_id` (uuid, FK)
- `table_ids` (jsonb) — array of table UUIDs
- `combined_capacity` (integer)
- `is_active` (boolean, default true)
- `name` (text, nullable)
- `created_at` (timestamp)

## Existing Files (DO NOT MODIFY)
- `src/app/api/admin/inventory/zones/route.ts` — Already created with GET, POST, PATCH, DELETE
- `src/lib/utils/admin-auth.ts` — getAdminUser(), getServiceClient(), RESTAURANT_ID
- `src/lib/utils/constants.ts` — RESTAURANT_ID constant

## Files to Create

### 1. `src/app/api/admin/inventory/tables/route.ts`
API route with:
- **GET**: List all tables for the restaurant, ordered by zone (table_zones.name) then sort_order. Include zone_name from join. Filter by `zone_id` query param if provided.
- **PATCH**: Batch update tables. Body: `{ updates: Array<{ id: string, ...partial fields }> }`. Update each table by id. Return updated tables.

### 2. `src/app/api/admin/inventory/tables/[id]/route.ts`
API route with:
- **PATCH**: Update single table (toggle is_active, change zone, capacity, etc.). Body: partial table fields. Return updated table.
- **DELETE**: Delete a table by id.

### 3. `src/app/api/admin/inventory/combinations/route.ts`
API route with:
- **GET**: List all combinations with their table_ids resolved to table details.
- **POST**: Create a new combination. Body: `{ table_ids: string[], name?: string }`. Calculate `combined_capacity` from sum of table capacities. Validate all tables exist and belong to restaurant.
- **PATCH**: Update a combination. Body: `{ id: string, ...partial fields }`. Recalculate `combined_capacity` if `table_ids` changes.
- **DELETE**: Delete a combination by id (body: `{ id: string }`). Also reset `can_combine` and `combine_group` on affected tables.

### 4. `src/app/api/admin/inventory/__tests__/zones.test.ts`
Test the zones API route. Mock getAdminUser and getServiceClient (Supabase client). Test:
- GET returns zones list
- GET returns 403 if not admin
- POST creates a zone (validates name required)
- PATCH updates a zone
- DELETE removes zone (returns 409 if has tables)
- DELETE returns 403 if not admin

### 5. `src/app/api/admin/inventory/__tests__/tables.test.ts`
Test the tables API route. Mock similarly. Test:
- GET returns tables list with zone info
- GET filters by zone_id
- PATCH batch updates tables
- PATCH returns 403 if not admin
- Single table PATCH toggles is_active
- Single table DELETE removes a table

## Mock Pattern for Supabase in Tests

Create a helper file `src/test/mocks/supabase.ts` with reusable mock builders:

```typescript
// Mock for Supabase chainable client
export function createSupabaseMock(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    ...overrides,
  }
  // Make chain resolve to data
  chain.single.mockResolvedValue({ data: {}, error: null })
  chain.select.mockReturnThis()
  return chain
}

export function mockAdminAuth(mockedModule: any, adminUser: any = { id: 'admin-1', email: 'admin@test.com', role: 'store_admin' }) {
  mockedModule.getAdminUser = vi.fn().mockResolvedValue(adminUser)
  mockedModule.getServiceClient = vi.fn().mockReturnValue(/* supabase mock */)
  mockedModule.RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'
}
```

## Important Notes
- Use the EXACT same auth pattern as `occupancy/route.ts` and the existing `inventory/zones/route.ts`
- All API responses in Spanish (error messages like 'No autorizado', 'Zona no encontrada')
- Zone names: Taller, Tipi, Jardín, Chispas, Attic
- Table nomenclature: 1A-11A (Taller), 1B-10B (Tipi), 1C-8C (Jardín), 1D-6D (Chispas), 1E-9E (Attic)
- Error responses always have shape `{ error: string }`
- Success responses use descriptive keys: `{ zones: [...] }`, `{ tables: [...] }`, `{ zone: {...} }`, `{ table: {...} }`
- Run tests with: `npx vitest run`

## Validation
After creating all files, run `npx vitest run` and ensure ALL tests pass. Fix any failures.