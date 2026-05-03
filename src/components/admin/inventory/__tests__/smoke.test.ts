import { describe, it, expect, vi } from 'vitest'

// The simplest possible test to check vitest is working
describe('Inventory smoke', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })

  it('can mock useTableInventory', () => {
    vi.mock('@/lib/hooks/useTableInventory', () => ({
      useTableInventory: vi.fn().mockReturnValue({
        data: { zones: [], tables: [], combinations: [] },
        loading: false,
        error: null,
        refetch: vi.fn(),
        toggleTable: vi.fn(),
        updateTable: vi.fn(),
        deleteTable: vi.fn(),
        batchUpdateTables: vi.fn(),
        createCombination: vi.fn(),
        updateCombination: vi.fn(),
        deleteCombination: vi.fn(),
        createZone: vi.fn(),
        updateZone: vi.fn(),
        deleteZone: vi.fn(),
      }),
    }))
    expect(true).toBe(true)
  })
})