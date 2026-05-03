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

import { GET, POST, PATCH, DELETE } from '../zones/route'

function createRequest(body?: unknown) {
  const req = new NextRequest('http://localhost')
  if (body !== undefined) {
    req.json = vi.fn().mockResolvedValue(body)
  }
  return req as unknown as NextRequest
}

describe('Zones API — GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('returns zones list', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData([
      { id: 'z1', name: 'Terraza', description: 'Terraza exterior', sort_order: 1 },
      { id: 'z2', name: 'Bar', description: null, sort_order: 2 },
    ])
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await GET(createRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.zones).toHaveLength(2)
    expect(body.zones[0].name).toBe('Terraza')
  })

  it('returns 403 if not admin', async () => {
    mockGetAdminUser.mockResolvedValue(null)
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await GET(createRequest())
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('No autorizado')
  })
})

describe('Zones API — POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('creates a zone', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData({ id: 'z-new', name: 'Nueva Zona', description: 'Desc', sort_order: 3 })
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await POST(createRequest({ name: 'Nueva Zona', description: 'Desc', sort_order: 3 }))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.zone.name).toBe('Nueva Zona')
    // Verify insert was called with correct data
    const insertCall = mockSb.from.mock.results[0]?.value.insert.mock.calls[0]
    expect(insertCall).toBeDefined()
    expect(insertCall[0].name).toBe('Nueva Zona')
    expect(insertCall[0].restaurant_id).toBe('test-restaurant-id')
  })

  it('validates name is required', async () => {
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await POST(createRequest({ description: 'No name' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('El nombre de la zona es requerido')
  })

  it('returns 403 if not admin', async () => {
    mockGetAdminUser.mockResolvedValue(null)
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await POST(createRequest({ name: 'Test' }))
    expect(res.status).toBe(403)
  })
})

describe('Zones API — PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('updates a zone', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setData({ id: 'z1', name: 'Actualizado', description: null, sort_order: 1 })
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await PATCH(createRequest({ id: 'z1', name: 'Actualizado', description: '' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.zone.name).toBe('Actualizado')
  })

  it('returns 400 if id is missing', async () => {
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await PATCH(createRequest({ name: 'No ID' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('ID de zona requerido')
  })
})

describe('Zones API — DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminUser.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com', role: 'store_admin' })
  })

  it('removes a zone', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setCount(0) // No tables assigned
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await DELETE(createRequest({ id: 'z1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 409 if zone has tables', async () => {
    const mockSb = createSupabaseMock()
    mockSb.setCount(3) // Has 3 tables
    mockGetServiceClient.mockReturnValue(mockSb)

    const res = await DELETE(createRequest({ id: 'z1' }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('tiene 3 mesa')
  })

  it('returns 403 if not admin', async () => {
    mockGetAdminUser.mockResolvedValue(null)
    mockGetServiceClient.mockReturnValue(createSupabaseMock())

    const res = await DELETE(createRequest({ id: 'z1' }))
    expect(res.status).toBe(403)
  })
})
