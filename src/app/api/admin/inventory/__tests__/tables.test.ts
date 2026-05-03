import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createSupabaseMock } from '@/test/mocks/supabase'

const { mockGetAdminUser, mockGetServiceClient } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockGetServiceClient: vi.fn(),
}))

vi.mock('@/lib/utils/admin-auth', () => ({
  getAdminUser: mockGetAdminUser,
  getServiceClient: mockGetServiceClient,
  RESTAURANT_ID: 'test-restaurant-id',
}))

import { GET, PATCH } from '../tables/route'

function createRequest(url?: string, body?: unknown) {
  const req = new NextRequest(url || 'http://localhost')
  if (body !== undefined) {
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req as unknown as NextRequest
}

describe('Tables API — GET (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('returns tables with zone info', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData([
      { id: 't1', number: '1', capacity: 4, zone_id: 'z1', sort_order: 1, zone: { name: 'Terraza' } },
      { id: 't2', number: '2', capacity: 2, zone_id: 'z2', sort_order: 1, zone: { name: 'Bar' } },
    ])
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await GET(createRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tables).toHaveLength(2)
    expect(body.tables[0].zone.name).toBe('Bar')
    expect(body.tables[1].zone.name).toBe('Terraza')
  })

  it('filters by zone_id', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData([
      { id: 't1', number: '1', capacity: 4, zone_id: 'z1', sort_order: 1, zone: { name: 'Terraza' } },
    ])
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await GET(createRequest('http://localhost?zone_id=z1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tables).toHaveLength(1)

    // Verify eq('zone_id', 'z1') was called
    const eqCalls = mockSb.from.mock.results[0]?.value.eq.mock.calls
    const zoneFilter = eqCalls?.find((c: [string, string]) => c[0] === 'zone_id')
    expect(zoneFilter).toBeDefined()
    expect(zoneFilter[1]).toBe('z1')
  })

  it('returns 403 if not admin', async () => {
    mockGetAdminUser.mockResolvedValue(null)
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await GET(createRequest())
    expect(res.status).toBe(403)
  })
})

describe('Tables API — PATCH (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('batch updates tables', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData({ id: 't1', number: '1-A', capacity: 6, zone_id: 'z1', zone: { name: 'Terraza' } })
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await PATCH(createRequest(undefined, {
      updates: [{ id: 't1', number: '1-A', capacity: 6 }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tables).toHaveLength(1)
    expect(body.tables[0].number).toBe('1-A')
  })

  it('returns 400 if updates is not an array', async () => {
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await PATCH(createRequest(undefined, { updates: 'not-array' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Se requiere un arreglo de actualizaciones')
  })

  it('returns 403 if not admin', async () => {
    mockGetAdminUser.mockResolvedValue(null)
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await PATCH(createRequest(undefined, { updates: [{ id: 't1' }] }))
    expect(res.status).toBe(403)
  })
})

describe('Tables API — single table PATCH and DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('PATCH toggles is_active on a single table', async () => {
    // Dynamic import so the mock is set up first
    const { PATCH: SinglePatch } = await import('../tables/[id]/route')

    const mockSb = createSupabaseMock()
    mockSb.setData({ id: 't1', number: '1', is_active: false, zone_id: 'z1', zone: { name: 'Terraza' } })
    mockGetServiceClient.mockReturnValue(mockSb)

    const req = createRequest(undefined, { is_active: false })
    const res = await SinglePatch(req, { params: Promise.resolve({ id: 't1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.table.is_active).toBe(false)
  })

  it('DELETE removes a table', async () => {
    const { DELETE: SingleDelete } = await import('../tables/[id]/route')

    const mockSb = createSupabaseMock()
    mockGetServiceClient.mockReturnValue(mockSb)

    const req = createRequest()
    const res = await SingleDelete(req, { params: Promise.resolve({ id: 't1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    // Verify delete was called with correct params
    const deleteBuilder = mockSb.from.mock.results[0]?.value
    expect(deleteBuilder.delete).toHaveBeenCalled()
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 't1')
    expect(deleteBuilder.eq).toHaveBeenCalledWith('restaurant_id', 'test-restaurant-id')
  })

  it('PATCH returns 404 for non-existent table', async () => {
    const { PATCH: SinglePatch } = await import('../tables/[id]/route')

    const mockSb = createSupabaseMock()
    mockSb.setData(null) // No data returned
    mockGetServiceClient.mockReturnValue(mockSb)

    const req = createRequest(undefined, { is_active: true })
    const res = await SinglePatch(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Mesa no encontrada')
  })
})
