# Task: Create UI Components for Table Inventory Module

You are working on the Attick & Keller restaurant admin app. Create the UI components for the Table Inventory admin module.

## Project Context
- **Project root**: `/mnt/f/attick-keller/web/`
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Phosphor Icons, Framer Motion
- **Palette**: Primary `#6B2737` (burgundy), Background `#F5EDE0` (cream), Secondary `#8D6E63` (warm brown)
- **Shared components**: `SectionHeading` from `@/components/admin/shared/SectionHeading`, `AnimatedCard` from `@/components/admin/shared/AnimatedCard`
- **Icons**: Use `@phosphor-icons/react` — import like `import { Table, Pencil, Trash, Plus, Check, X, ArrowsOut, Eye } from '@phosphor-icons/react'`
- **Mobile-first**: Admin uses phone, so design for small screens (single column, large touch targets 44px min)
- **Hook**: `useTableInventory` from `@/lib/hooks/useTableInventory` provides:
  ```typescript
  const { data, loading, error, refetch,
    toggleTable, updateTable, deleteTable, batchUpdateTables,
    createCombination, updateCombination, deleteCombination,
    createZone, updateZone, deleteZone } = useTableInventory()
  // data: { zones: Zone[], tables: Table[], combinations: Combination[] }
  ```
- **Types**: `import type { Zone, Table, Combination } from '@/lib/types/inventory'`

## Design System
- Use `AnimatedCard` for each card/section (it handles fade-in animations)
- Use `SectionHeading` for section titles (uppercase, brown, small text)
- Buttons: rounded-lg, with Phosphor icons, primary uses bg-[#6B2737] text-white hover:bg-[#5a1f2e]
- Inputs: rounded-lg border border-[#D7CCC8] focus:border-[#6B2737] bg-white
- Toggle switch: custom Tailwind, not a library
- All text in Spanish (colombian style)

## Files to Create

### 1. `src/components/admin/inventory/TablesPanel.tsx`
Main container component. This is what gets rendered in AdminShell when the "Mesas" tab is active.
- Uses `useTableInventory()` hook
- Shows loading spinner while data loads
- Shows error message if fetch fails
- Groups tables by zone (using zone_id)
- Each zone has a collapsible section with zone name and table count
- Unassigned tables shown in a separate "Sin zona" section at bottom
- Shows combinations section at bottom
- Floating action button (FAB) to add new zone (opens ZoneEditor)

### 2. `src/components/admin/inventory/ZoneEditor.tsx`
Modal/sheet for creating/editing a zone.
- Props: `{ zone?: Zone, onClose: () => void, onSave: () => void }`
- If zone prop exists, edit mode; otherwise create mode
- Fields: name (required), description (optional), sort_order
- Uses AnimatedCard for the modal container
- Validates name is not empty before saving
- Calls createZone or updateZone from hook

### 3. `src/components/admin/inventory/TableCard.tsx`
Individual table card component.
- Props: `{ table: Table, onToggle: (id: string, active: boolean) => void, onEdit: (table: Table) => void }`
- Shows table number (nomenclatura like "1A"), zone name, capacity
- Shows active/inactive badge with color (green/red)
- Toggle switch to activate/deactivate (calls onToggle)
- Edit button that opens TableEditor
- Shows capacity_min if different from capacity (e.g., "2-4 personas")
- Shows name_attick if present (the display name)
- Shows can_combine badge if true
- Mobile-friendly: large touch targets

### 4. `src/components/admin/inventory/TableEditor.tsx`
Modal/sheet for editing a table.
- Props: `{ table?: Table, zoneId?: string, onClose: () => void, onSave: () => void }`
- If table prop exists, edit mode; otherwise create mode
- Fields: number (nomenclatura), capacity, capacity_min, name_attick, zone_id (dropdown from zones), can_combine toggle, combine_group
- Validate required fields
- Calls updateTable or createTable from hook

### 5. `src/components/admin/inventory/CombinationEditor.tsx`
Modal/sheet for creating/editing a table combination.
- Props: `{ combination?: Combination, tables: Table[], onClose: () => void, onSave: () => void }`
- Multi-select of available tables (that have can_combine=true)
- Shows combined capacity (sum of selected tables)
- Name field (optional)
- Calls createCombination or updateCombination

### 6. `src/components/admin/inventory/__tests__/TablesPanel.test.tsx`
Test the TablesPanel component:
- Renders loading state
- Renders zone groups with tables
- Toggling a table's active state calls onToggle
- Shows error message on fetch failure

## Important Design Notes
- Use `'use client'` directive at top of all components
- All text in Spanish: "Mesas", "Zonas", "Sin zona", "Combinaciones", "Editar", "Eliminar", "Guardar", "Cancelar", "Capacidad", "Activar", "Desactivar"
- Use Tailwind classes only (no CSS modules or styled-components)
- Modal/sheet: use a fixed overlay with z-50, bg-black/50 backdrop, centered card
- FAB: fixed bottom-right, rounded-full, w-14 h-14, bg-[#6B2737]
- Zone sections should show count: "Taller (11 mesas)"
- Sort tables within zones by sort_order
- When there's 0 tables in a zone, show "Sin mesas en esta zona"

## Validation
After creating all files, run `npx vitest run` and ensure ALL tests pass. Fix any failures.