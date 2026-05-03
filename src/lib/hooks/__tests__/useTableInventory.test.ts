import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { useTableInventory } from '../useTableInventory'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockZonesData = {
  zones: [
    { id: 'z1', name: 'Terraza', description: null, sort_order: 0 },
  ],
}

const mockTablesData = {
  tables: [
    {
      id: 't1',
      number: '1A',
      capacity: 4,
      capacity_min: 1,
      name_attick: null,
      is_active: true,
      zone_id: 'z1',
      zone: { name: 'Terraza' },
      can_combine: false,
      combine_group: null,
      sort_order: 0,
    },
  ],
}

const mockCombinationsData = { combinations: [] }

// ---------------------------------------------------------------------------
// Mock supabase channel API (used for realtime subscriptions)
// ---------------------------------------------------------------------------

const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn() }

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockInitialFetch(fetch: Mock) {
  fetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockZonesData) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTablesData) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCombinationsData) })
}

function mockRefetch(fetch: Mock) {
  // refetch calls fetchData which does 3 parallel fetches
  fetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockZonesData) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockTablesData) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCombinationsData) })
}

async function renderAndWait() {
  const fetch = global.fetch as Mock
  mockInitialFetch(fetch)

  const rendered = renderHook(() => useTableInventory())
  await waitFor(() => expect(rendered.result.current.loading).toBe(false))

  return rendered
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTableInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('initial data fetch', () => {
    it('fetches zones, tables, and combinations in parallel on mount', async () => {
      const { result } = await renderAndWait()

      expect(result.current.data?.zones).toEqual(mockZonesData.zones)
      expect(result.current.data?.tables).toEqual(mockTablesData.tables)
      expect(result.current.data?.combinations).toEqual(mockCombinationsData.combinations)
      expect(result.current.error).toBeNull()
    })

    it('starts with loading=true (initial state) and transitions to loading=false after fetch', async () => {
      const fetch = global.fetch as Mock
      mockInitialFetch(fetch)

      const { result } = renderHook(() => useTableInventory())
      // Initial state is true; the effect also setsLoading(true) synchronously
      expect(result.current.loading).toBe(true)

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.data).not.toBeNull()
    })

    it('sets error state on network failure', async () => {
      const fetch = global.fetch as Mock
      fetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTableInventory())
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBe('Error de conexión')
      expect(result.current.data).toBeNull()
    })
  })

  describe('refetch', () => {
    it('reloads all data and updates loading state', async () => {
      const fetch = global.fetch as Mock

      // Initial load with normal resolved values
      mockInitialFetch(fetch)

      const { result } = renderHook(() => useTableInventory())
      await waitFor(() => expect(result.current.loading).toBe(false))

      // Refetch — refetch should complete and data should be refreshed
      mockRefetch(fetch)
      await result.current.refetch()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      // Verify refetch was called (6 fetch calls total: 3 initial + 3 refetch)
      expect(fetch).toHaveBeenCalledTimes(6)
    })
  })

  describe('table mutations', () => {
    it('toggleTable sends PATCH with is_active and refetches', async () => {
      const fetch = global.fetch as Mock
      mockInitialFetch(fetch)

      const { result } = renderHook(() => useTableInventory())
      await waitFor(() => expect(result.current.loading).toBe(false))

      // toggleTable: PATCH + refetch
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ table: { id: 't1', is_active: false } }) })
      mockRefetch(fetch)

      const table = await result.current.toggleTable('t1', false)
      expect(table.is_active).toBe(false)

      // Verify the PATCH URL
      const patchCall = fetch.mock.calls.find(
        (call: unknown[]) => call[0] === '/api/admin/inventory/tables/t1',
      )
      expect(patchCall).toBeDefined()
      if (patchCall) {
        expect(patchCall[1]).toMatchObject({ method: 'PATCH' })
        expect(JSON.parse(patchCall[1].body)).toEqual({ is_active: false })
      }
    })
  })

  describe('zone mutations', () => {
    it('createZone sends POST and refetches', async () => {
      const fetch = global.fetch as Mock
      mockInitialFetch(fetch)

      const { result } = renderHook(() => useTableInventory())
      await waitFor(() => expect(result.current.loading).toBe(false))

      const newZone = { id: 'z2', name: 'Bar', description: 'Bar area', sort_order: 1 }
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ zone: newZone }) })
      mockRefetch(fetch)

      const zone = await result.current.createZone('Bar', 'Bar area', 1)
      expect(zone.name).toBe('Bar')

      const postCall = fetch.mock.calls.find(
        (call: unknown[]) => call[0] === '/api/admin/inventory/zones' && call[1]?.method === 'POST',
      )
      expect(postCall).toBeDefined()
    })

    it('deleteZone sends DELETE and refetches', async () => {
      const fetch = global.fetch as Mock
      mockInitialFetch(fetch)

      const { result } = renderHook(() => useTableInventory())
      await waitFor(() => expect(result.current.loading).toBe(false))

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      mockRefetch(fetch)

      await result.current.deleteZone('z1')

      // The DELETE call should be after the initial 3 fetch calls
      const deleteCall = fetch.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'DELETE',
      )
      expect(deleteCall).toBeDefined()
      expect(deleteCall![0]).toBe('/api/admin/inventory/zones')
    })
  })
})
