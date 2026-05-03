import { vi } from 'vitest'

interface SupabaseQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  not: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: ((resolve: (value: { data: unknown; error: unknown }) => void) => void) | undefined
}

interface SupabaseMock {
  from: ReturnType<typeof vi.fn>
  _builders: Map<string, SupabaseQueryBuilder>
  setData: (data: unknown) => void
  setError: (error: unknown) => void
  setCount: (count: number | null) => void
}

export function createSupabaseMock(): SupabaseMock {
  let currentData: unknown = null
  let currentError: unknown = null
  let currentCount: number | null = null

  const builders = new Map<string, SupabaseQueryBuilder>()

  function makeBuilder(): SupabaseQueryBuilder {
    const builder: SupabaseQueryBuilder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      single: vi.fn(() => builder),
      in: vi.fn(() => builder),
      not: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      or: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: undefined,
    }

    const thenFn = (
      resolve: (value: { data: unknown; error: unknown; count?: number | null }) => void
    ) => {
      return resolve({ data: currentData, error: currentError, count: currentCount })
    }
    builder.then = thenFn

    return builder
  }

  const sb: SupabaseMock = {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) {
        builders.set(table, makeBuilder())
      }
      return builders.get(table)!
    }),
    _builders: builders,
    setData: (data: unknown) => { currentData = data },
    setError: (error: unknown) => { currentError = error },
    setCount: (count: number | null) => { currentCount = count },
  }

  return sb
}

export function createMockAdminAuth() {
  const mockGetAdminUser = vi.fn()
  const mockGetServiceClient = vi.fn()
  const mockRestaurantId = 'test-restaurant-id'

  return {
    mockGetAdminUser,
    mockGetServiceClient,
    mockRestaurantId,
    setupAdminMock: (isAdmin = true) => {
      mockGetAdminUser.mockResolvedValue(
        isAdmin ? { id: 'admin-id', email: 'admin@test.com', role: 'store_admin' } : null
      )
    },
    setupServiceClient: (mockSb: SupabaseMock) => {
      mockGetServiceClient.mockReturnValue(mockSb)
    },
  }
}
