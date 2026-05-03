import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TablesPanel } from '../TablesPanel'
import type { Zone, Table, Combination } from '@/lib/types/inventory'

// Mock sub-components
vi.mock('../ZoneEditor', () => ({
  ZoneEditor: ({ onClose }: any) => (
    <div data-testid="zone-editor"><button onClick={onClose}>Close</button></div>
  ),
}))
vi.mock('../TableEditor', () => ({
  TableEditor: ({ onClose }: any) => (
    <div data-testid="table-editor"><button onClick={onClose}>Close</button></div>
  ),
}))
vi.mock('../CombinationEditor', () => ({
  CombinationEditor: ({ onClose }: any) => (
    <div data-testid="combination-editor"><button onClick={onClose}>Close</button></div>
  ),
}))
vi.mock('../shared/AnimatedCard', () => ({
  AnimatedCard: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('../shared/SectionHeading', () => ({
  SectionHeading: ({ children }: any) => <h3>{children}</h3>,
}))
vi.mock('../shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onCancel }: any) =>
    open ? <div data-testid="confirm-dialog"><button onClick={onCancel}>Cancelar</button></div> : null,
}))
vi.mock('../shared/EmptyState', () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state"><p>{title}</p>{description && <p>{description}</p>}</div>
  ),
}))

// Shared mock functions
const mockToggleTable = vi.fn().mockResolvedValue(undefined)
const mockDeleteZone = vi.fn().mockResolvedValue(undefined)
const mockDeleteCombination = vi.fn().mockResolvedValue(undefined)
const mockRefetch = vi.fn()

// Per-test mock state (set by mockHookData, consumed by the implementation below)
let _mockData: ReturnType<typeof createMockData> = {
  data: null,
  loading: true,
  error: null,
}

function createMockData(overrides: {
  loading?: boolean
  error?: string | null
  zones?: Zone[]
  tables?: Table[]
  combinations?: Combination[]
}) {
  const { loading = false, error = null, zones = [], tables = [], combinations = [] } = overrides
  return {
    data: loading || error ? null : { zones, tables, combinations },
    loading,
    error,
  }
}

vi.mock('@/lib/hooks/useTableInventory', () => ({
  useTableInventory: vi.fn(() => ({
    ..._mockData,
    refetch: mockRefetch,
    toggleTable: mockToggleTable,
    updateTable: vi.fn(),
    deleteTable: vi.fn(),
    batchUpdateTables: vi.fn(),
    createCombination: vi.fn(),
    updateCombination: vi.fn(),
    deleteCombination: mockDeleteCombination,
    createZone: vi.fn(),
    updateZone: vi.fn(),
    deleteZone: mockDeleteZone,
  })),
}))

function mockHookData(overrides: {
  loading?: boolean
  error?: string | null
  zones?: Zone[]
  tables?: Table[]
  combinations?: Combination[]
}) {
  _mockData = createMockData(overrides)
}

const mockZones: Zone[] = [
  { id: 'z1', name: 'Terraza', description: null, sort_order: 0 },
  { id: 'z2', name: 'Salon Principal', description: 'Interior', sort_order: 1 },
]

const mockTables: Table[] = [
  { id: 't1', number: '1A', capacity: 4, capacity_min: 1, name_attick: 'Esquinera', is_active: true, zone_id: 'z1', zone: { name: 'Terraza' }, can_combine: true, combine_group: 'terraza-sur', sort_order: 0 },
  { id: 't2', number: '2B', capacity: 2, capacity_min: 2, name_attick: null, is_active: false, zone_id: 'z1', zone: { name: 'Terraza' }, can_combine: false, combine_group: null, sort_order: 1 },
  { id: 't3', number: '3C', capacity: 6, capacity_min: 2, name_attick: null, is_active: true, zone_id: 'z2', zone: { name: 'Salon Principal' }, can_combine: false, combine_group: null, sort_order: 0 },
]

const mockCombinations: Combination[] = [
  { id: 'c1', table_ids: ['t1', 't2'], combined_capacity: 6, is_active: true, name: 'Terraza sur combo', restaurant_id: 'r1', created_at: '2024-01-01' },
]

describe('TablesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToggleTable.mockResolvedValue(undefined)
    mockDeleteZone.mockResolvedValue(undefined)
    mockDeleteCombination.mockResolvedValue(undefined)
    // Reset to default loading state
    _mockData = createMockData({ loading: true })
  })

  it('renders zone names when data loaded', () => {
    mockHookData({ zones: mockZones, tables: mockTables, combinations: [] })
    render(<TablesPanel />)
    // Zone names appear in h3 headers and span badges — use getAllByText
    expect(screen.getAllByText('Terraza').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Salon Principal').length).toBeGreaterThanOrEqual(1)
  })

  it('renders table numbers within zones', async () => {
    mockHookData({ zones: mockZones, tables: mockTables, combinations: [] })
    render(<TablesPanel />)
    // Wait for zones to expand via useEffect
    await waitFor(() => {
      expect(screen.getByText('1A')).toBeInTheDocument()
    })
  })

  it('renders empty state when no data', () => {
    mockHookData({ zones: [], tables: [], combinations: [] })
    render(<TablesPanel />)
    expect(screen.getByText('No hay mesas ni zonas')).toBeInTheDocument()
  })

  it('shows error state on fetch failure', () => {
    mockHookData({ error: 'Error de conexión' })
    render(<TablesPanel />)
    expect(screen.getByText('Error al cargar')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('calls toggleTable on switch click', async () => {
    mockHookData({ zones: mockZones, tables: mockTables, combinations: [] })
    render(<TablesPanel />)
    await waitFor(() => {
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
    })
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(mockToggleTable).toHaveBeenCalledWith('t1', false)
    })
  })

  it('shows combinations section when combos exist', async () => {
    mockHookData({ zones: mockZones, tables: mockTables, combinations: mockCombinations })
    render(<TablesPanel />)
    await waitFor(() => {
      expect(screen.getByText('Combinaciones')).toBeInTheDocument()
    })
  })

  it('shows sin zona section for unassigned tables', () => {
    const unassigned: Table[] = [
      { ...mockTables[0], id: 't99', zone_id: null, zone: null },
    ]
    mockHookData({ zones: [], tables: unassigned, combinations: [] })
    render(<TablesPanel />)
    // "Sin zona" is inside a heading like "Sin zona (1 mesas)"
    expect(screen.getByText(/Sin zona/)).toBeInTheDocument()
  })
})
