# Task: Create TypeScript Types + useTableInventory Hook + Tests

You are working on the Attick & Keller restaurant admin app. Create the type definitions and the main data-fetching hook for the Table Inventory module.

## Project Context
- **Project root**: `/mnt/f/attick-keller/web/`
- **Stack**: Next.js 16, React 19, TypeScript, Supabase, Vitest
- **Existing hook pattern**: See `src/lib/hooks/useAdminOccupancy.ts` for reference
- **API routes already exist**:
  - `GET /api/admin/inventory/zones` → `{ zones: Zone[] }`
  - `GET /api/admin/inventory/tables` → `{ tables: Table[] }`
  - `GET /api/admin/inventory/tables?zone_id=xxx` → `{ tables: Table[] }` (filtered)
  - `PATCH /api/admin/inventory/tables` → `{ tables: Table[] }` (batch update, body: `{ updates: [...] }`)
  - `PATCH /api/admin/inventory/tables/[id]` → `{ table: Table }`
  - `DELETE /api/admin/inventory/tables/[id]` → `{ success: true }`
  - `GET /api/admin/inventory/combinations` → `{ combinations: Combination[] }`
  - `POST /api/admin/inventory/combinations` → `{ combination: Combination }`
  - `PATCH /api/admin/inventory/combinations` → `{ combination: Combination }`
  - `DELETE /api/admin/inventory/combinations` → `{ success: true }`

## DB Schema (for types)

### table_zones
- id: uuid (string in TS)
- restaurant_id: uuid
- name: string
- description: string | null
- sort_order: number
- created_at: string (ISO)

### tables
- id: uuid (string in TS)
- restaurant_id: uuid
- zone_id: uuid | null
- number: string (nomenclatura like "1A", "2B")
- capacity: number
- capacity_min: number
- name_attick: string | null
- is_active: boolean
- can_combine: boolean
- combine_group: string | null
- sort_order: number
- created_at: string (ISO)
- zone: { name: string } | null (from join)

### table_combinations
- id: uuid (string in TS)
- restaurant_id: uuid
- table_ids: string[] (jsonb array in DB)
- combined_capacity: number
- is_active: boolean
- name: string | null
- created_at: string (ISO)

## Files to Create

### 1. `src/lib/types/inventory.ts`
Define all TypeScript interfaces:
```typescript
export interface Zone {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface Table {
  id: string
  number: string
  capacity: number
  capacity_min: number
  name_attick: string | null
  is_active: boolean
  zone_id: string | null
  zone: { name: string } | null
  can_combine: boolean
  combine_group: string | null
  sort_order: number
}

export interface Combination {
  id: string
  table_ids: string[]
  combined_capacity: number
  is_active: boolean
  name: string | null
  restaurant_id: string
  created_at: string
}
```

Also export request/response helper types for the API:
```typescript
export interface TableUpdate {
  id: string
  number?: string
  capacity?: number
  capacity_min?: number
  name_attick?: string | null
  is_active?: boolean
  can_combine?: boolean
  combine_group?: string | null
  zone_id?: string | null
  sort_order?: number
}

export interface CombinationCreate {
  table_ids: string[]
  name?: string
}

export interface CombinationUpdate {
  id: string
  table_ids?: string[]
  name?: string | null
  is_active?: boolean
}
```

### 2. `src/lib/hooks/useTableInventory.ts`
Follow the same pattern as `useAdminOccupancy.ts` but for the inventory module:

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RESTAURANT_ID } from '@/lib/utils/constants'
import type { Zone, Table, Combination } from '@/lib/types/inventory'

interface InventoryData {
  zones: Zone[]
  tables: Table[]
  combinations: Combination[]
}

export function useTableInventory() {
  const [data, setData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch all inventory data in parallel
  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, tablesRes, combosRes] = await Promise.all([
        fetch('/api/admin/inventory/zones'),
        fetch('/api/admin/inventory/tables'),
        fetch('/api/admin/inventory/combinations'),
      ])
      
      if (!zonesRes.ok || !tablesRes.ok || !combosRes.ok) {
        throw new Error('Error cargando inventario')
      }
      
      const [zonesData, tablesData, combosData] = await Promise.all([
        zonesRes.json(),
        tablesRes.json(),
        combosRes.json(),
      ])
      
      setData({
        zones: zonesData.zones || [],
        tables: tablesData.tables || [],
        combinations: combosData.combinations || [],
      })
      setError(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData()
    const interval = setInterval(fetchData, 300000) // 5 min fallback
    return () => clearInterval(interval)
  }, [fetchData])

  // Realtime: listen for changes on tables, table_zones, table_combinations
  useEffect(() => {
    const channel = supabase
      .channel('admin-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${RESTAURANT_ID}` }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchData(), 300)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_zones', filter: `restaurant_id=eq.${RESTAURANT_ID}` }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchData(), 300)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_combinations', filter: `restaurant_id=eq.${RESTAURANT_ID}` }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchData(), 300)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const refetch = useCallback(() => { setLoading(true); fetchData() }, [fetchData])

  // Mutations
  const toggleTable = useCallback(async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/inventory/tables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    if (!res.ok) throw new Error('Error al actualizar mesa')
    const d = await res.json()
    await refetch()
    return d.table as Table
  }, [refetch])

  const updateTable = useCallback(async (id: string, updates: Partial<Table>) => {
    const res = await fetch(`/api/admin/inventory/tables/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Error al actualizar mesa')
    const d = await res.json()
    await refetch()
    return d.table as Table
  }, [refetch])

  const deleteTable = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/inventory/tables/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Error al eliminar mesa')
    await refetch()
  }, [refetch])

  const batchUpdateTables = useCallback(async (updates: Array<{ id: string; [key: string]: unknown }>) => {
    const res = await fetch('/api/admin/inventory/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!res.ok) throw new Error('Error al actualizar mesas')
    const d = await res.json()
    await refetch()
    return d.tables as Table[]
  }, [refetch])

  const createCombination = useCallback(async (table_ids: string[], name?: string) => {
    const res = await fetch('/api/admin/inventory/combinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_ids, name }),
    })
    if (!res.ok) throw new Error('Error al crear combinación')
    const d = await res.json()
    await refetch()
    return d.combination as Combination
  }, [refetch])

  const updateCombination = useCallback(async (id: string, updates: { table_ids?: string[]; name?: string | null; is_active?: boolean }) => {
    const res = await fetch('/api/admin/inventory/combinations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) throw new Error('Error al actualizar combinación')
    const d = await res.json()
    await refetch()
    return d.combination as Combination
  }, [refetch])

  const deleteCombination = useCallback(async (id: string) => {
    const res = await fetch('/api/admin/inventory/combinations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error('Error al eliminar combinación')
    await refetch()
  }, [refetch])

  // Zone management mutations
  const createZone = useCallback(async (name: string, description?: string, sort_order?: number) => {
    const res = await fetch('/api/admin/inventory/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, sort_order }),
    })
    if (!res.ok) throw new Error('Error al crear zona')
    const d = await res.json()
    await refetch()
    return d.zone as Zone
  }, [refetch])

  const updateZone = useCallback(async (id: string, updates: { name?: string; description?: string | null; sort_order?: number }) => {
    const res = await fetch('/api/admin/inventory/zones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) throw new Error('Error al actualizar zona')
    const d = await res.json()
    await refetch()
    return d.zone as Zone
  }, [refetch])

  const deleteZone = useCallback(async (id: string) => {
    const res = await fetch('/api/admin/inventory/zones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error('Error al eliminar zona')
    await refetch()
  }, [refetch])

  return {
    data,
    loading,
    error,
    refetch,
    // Table mutations
    toggleTable,
    updateTable,
    deleteTable,
    batchUpdateTables,
    // Combination mutations
    createCombination,
    updateCombination,
    deleteCombination,
    // Zone mutations
    createZone,
    updateZone,
    deleteZone,
  }
}
```

### 3. `src/lib/hooks/__tests__/useTableInventory.test.ts`
Test the hook using `@testing-library/react` renderHook. Mock global fetch. Test:
- Initial fetch loads zones, tables, combinations
- Loading state transitions correctly
- Error state on failed fetch
- refetch reloads data
- toggleTable calls PATCH /api/admin/inventory/tables/[id] with { is_active: false }
- createZone calls POST /api/admin/inventory/zones
- deleteZone calls DELETE /api/admin/inventory/zones

## Important Notes
- Use React 19 patterns
- Mock `supabase` from `@/lib/supabase/client` in the test
- The hook should automatically refetch when realtime events fire
- Follow EXACTLY the pattern from `useAdminOccupancy.ts`
- Run tests with: `npx vitest run`
- After creating all files, run `npx vitest run` and fix any failures