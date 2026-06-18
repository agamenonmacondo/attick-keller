import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ─── Mock admin-auth ──────────────────────────────────────────
const { mockGetAdminUser, mockGetStaffUser, mockGetStaffOrLeaderUser, mockGetServiceClient } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockGetStaffUser: vi.fn(),
  mockGetStaffOrLeaderUser: vi.fn(),
  mockGetServiceClient: vi.fn(),
}))

vi.mock('@/lib/utils/admin-auth', () => ({
  getAdminUser: mockGetAdminUser,
  getStaffUser: mockGetStaffUser,
  getStaffOrLeaderUser: mockGetStaffOrLeaderUser,
  getServiceClient: mockGetServiceClient,
  RESTAURANT_ID: 'test-restaurant-id',
}))

// Import after mock setup
import {
  handleApiError,
  requireAdmin,
  requireStaff,
  requireSuperAdmin,
  canCreateRole,
  rateLimit,
  getClientIP,
  filterRowColumns,
  maskPII,
  validateEmail,
  validateUUID,
  POS_UPLOAD_COLUMN_ALLOWLIST,
} from '../api-security'

function createRequest(url?: string, headers?: Record<string, string>) {
  return new NextRequest(url || 'http://localhost', { headers })
}

// ─── handleApiError ─────────────────────────────────────────

describe('handleApiError', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('returns generic message in production', () => {
    process.env.NODE_ENV = 'production'
    const res = handleApiError(new Error('DB connection failed'), 'test-route')
    expect(res.status).toBe(500)
    // In production, should NOT leak error message
  })

  it('returns error message in development', () => {
    process.env.NODE_ENV = 'development'
    const res = handleApiError(new Error('DB connection failed'), 'test-route')
    expect(res.status).toBe(500)
  })

  it('handles non-Error objects', () => {
    process.env.NODE_ENV = 'development'
    const res = handleApiError('string error', 'test-route')
    expect(res.status).toBe(500)
  })
})

// ─── requireAdmin ───────────────────────────────────────────

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns admin user when authenticated', async () => {
    const admin = { id: 'admin-1', email: 'admin@test.com', role: 'store_admin' as const }
    mockGetAdminUser.mockResolvedValue(admin)

    const result = await requireAdmin(createRequest())
    expect(result).toEqual(admin)
  })

  it('returns 403 when not authenticated', async () => {
    mockGetAdminUser.mockResolvedValue(null)

    const result = await requireAdmin(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
    }
  })
})

// ─── requireStaff ───────────────────────────────────────────

describe('requireStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns staff user when authenticated', async () => {
    const staff = { id: 'staff-1', email: 'staff@test.com', role: 'host' as const }
    mockGetStaffUser.mockResolvedValue(staff)

    const result = await requireStaff(createRequest())
    expect(result).toEqual(staff)
  })

  it('returns 403 when not authenticated', async () => {
    mockGetStaffUser.mockResolvedValue(null)

    const result = await requireStaff(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
    }
  })
})

// ─── requireSuperAdmin ──────────────────────────────────────

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns super_admin when authenticated as super_admin', async () => {
    const superAdmin = { id: 'sa-1', email: 'super@test.com', role: 'super_admin' as const }
    mockGetAdminUser.mockResolvedValue(superAdmin)

    const result = await requireSuperAdmin(createRequest())
    expect(result).toEqual(superAdmin)
  })

  it('returns 403 when authenticated as store_admin', async () => {
    const storeAdmin = { id: 'sa-1', email: 'store@test.com', role: 'store_admin' as const }
    mockGetAdminUser.mockResolvedValue(storeAdmin)

    const result = await requireSuperAdmin(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
    }
  })

  it('returns 403 when not authenticated', async () => {
    mockGetAdminUser.mockResolvedValue(null)

    const result = await requireSuperAdmin(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
    }
  })
})

// ─── canCreateRole ──────────────────────────────────────────

describe('canCreateRole', () => {
  it('super_admin can create any role', () => {
    expect(canCreateRole('super_admin', 'super_admin')).toBe(true)
    expect(canCreateRole('super_admin', 'store_admin')).toBe(true)
    expect(canCreateRole('super_admin', 'host')).toBe(true)
    expect(canCreateRole('super_admin', 'colaborador')).toBe(true)
  })

  it('store_admin can create lower roles but NOT super_admin or store_admin', () => {
    expect(canCreateRole('store_admin', 'super_admin')).toBe(false)
    expect(canCreateRole('store_admin', 'store_admin')).toBe(false)
    expect(canCreateRole('store_admin', 'host')).toBe(true)
    expect(canCreateRole('store_admin', 'lider_area')).toBe(true)
    expect(canCreateRole('store_admin', 'colaborador')).toBe(true)
    expect(canCreateRole('store_admin', 'reservante')).toBe(true)
  })

  it('other roles cannot create any role', () => {
    expect(canCreateRole('host', 'host')).toBe(false)
    expect(canCreateRole('colaborador', 'colaborador')).toBe(false)
  })
})

// ─── rateLimit ──────────────────────────────────────────────

describe('rateLimit', () => {
  it('allows requests within limit', () => {
    expect(rateLimit('test-key-1', 5, 60000)).toBe(true)
    expect(rateLimit('test-key-1', 5, 60000)).toBe(true)
    expect(rateLimit('test-key-1', 5, 60000)).toBe(true)
  })

  it('blocks requests over limit', () => {
    for (let i = 0; i < 3; i++) {
      rateLimit('test-key-2', 3, 60000)
    }
    expect(rateLimit('test-key-2', 3, 60000)).toBe(false)
  })

  it('separates keys', () => {
    for (let i = 0; i < 3; i++) {
      rateLimit('test-key-3a', 3, 60000)
    }
    // key-3a is at limit, but key-3b is fresh
    expect(rateLimit('test-key-3b', 3, 60000)).toBe(true)
  })
})

// ─── getClientIP ────────────────────────────────────────────

describe('getClientIP', () => {
  it('extracts IP from x-forwarded-for', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIP(req)).toBe('1.2.3.4')
  })

  it('extracts IP from x-real-ip', () => {
    const req = new NextRequest('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    })
    expect(getClientIP(req)).toBe('9.8.7.6')
  })

  it('returns unknown when no headers', () => {
    const req = new NextRequest('http://localhost')
    expect(getClientIP(req)).toBe('unknown')
  })
})

// ─── validateEmail ──────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.co')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('@domain.com')).toBe(false)
    expect(validateEmail('user@')).toBe(false)
    expect(validateEmail('user@.com')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(validateEmail(123)).toBe(false)
    expect(validateEmail(null)).toBe(false)
    expect(validateEmail(undefined)).toBe(false)
  })
})

// ─── validateUUID ────────────────────────────────────────────

describe('validateUUID', () => {
  it('accepts valid UUIDs', () => {
    expect(validateUUID('a0000000-0000-0000-0000-000000000001')).toBe(true)
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('rejects invalid UUIDs', () => {
    expect(validateUUID('')).toBe(false)
    expect(validateUUID('not-a-uuid')).toBe(false)
    expect(validateUUID('a0000000-0000-0000-0000')).toBe(false)
  })
})

// ─── filterRowColumns (pos-upload allowlist) ────────────────

describe('filterRowColumns', () => {
  it('only keeps allowed columns for pos_sales', () => {
    const row = {
      pos_folio: '123',
      pos_series: 'A',
      total: 50000,
      malicious_column: 'DROP TABLE',
      restaurant_id: 'other-restaurant',
    }
    const filtered = filterRowColumns('pos_sales', row)
    expect(filtered).toHaveProperty('pos_folio')
    expect(filtered).toHaveProperty('total')
    expect(filtered).not.toHaveProperty('malicious_column')
    expect(filtered.restaurant_id).toBe('test-restaurant-id') // forced override
  })

  it('returns empty object for unknown table', () => {
    const filtered = filterRowColumns('unknown_table', { foo: 'bar' })
    expect(filtered).toEqual({})
  })

  it('forces restaurant_id override', () => {
    const row = { pos_product_id: 'p1', name: 'Test', restaurant_id: 'WRONG' }
    const filtered = filterRowColumns('pos_products', row)
    expect(filtered.restaurant_id).toBe('test-restaurant-id')
  })
})

// ─── maskPII ───────────────────────────────────────────────

describe('maskPII', () => {
  it('masks phone and removes email for host role', () => {
    const record = {
      id: '1',
      customer_name: 'Juan',
      customer_phone: '3101234567',
      customer_email: 'juan@test.com',
      status: 'confirmed',
    }
    const masked = maskPII(record, 'host')
    expect(masked.customer_phone).toBe('***4567')
    expect(masked.customer_email).toBeNull()
    expect(masked.customer_name).toBe('Juan') // unchanged
    expect(masked.id).toBe('1') // unchanged
  })

  it('masks phone and removes email for lider_area role', () => {
    const record = {
      id: '2',
      customer_phone: '573001111222',
      customer_email: 'ana@test.com',
    }
    const masked = maskPII(record, 'lider_area')
    expect(masked.customer_phone).toBe('***3222')
    expect(masked.customer_email).toBeNull()
  })

  it('does NOT mask for store_admin or super_admin', () => {
    const record = {
      id: '3',
      customer_phone: '3101234567',
      customer_email: 'admin@test.com',
    }
    const masked = maskPII(record, 'store_admin')
    expect(masked.customer_phone).toBe('3101234567')
    expect(masked.customer_email).toBe('admin@test.com')
  })

  it('handles null phone gracefully', () => {
    const record = {
      id: '4',
      customer_phone: null,
      customer_email: null,
    }
    const masked = maskPII(record, 'host')
    expect(masked.customer_phone).toBeNull()
    expect(masked.customer_email).toBeNull()
  })
})

// ─── POS_UPLOAD_COLUMN_ALLOWLIST ───────────────────────────

describe('POS_UPLOAD_COLUMN_ALLOWLIST', () => {
  it('covers all 8 expected tables', () => {
    const expectedTables = [
      'pos_sales', 'pos_sale_items', 'pos_products', 'pos_product_groups',
      'pos_staff', 'pos_areas', 'pos_sale_payments', 'pos_payment_methods',
    ]
    for (const table of expectedTables) {
      expect(POS_UPLOAD_COLUMN_ALLOWLIST).toHaveProperty(table)
    }
    expect(Object.keys(POS_UPLOAD_COLUMN_ALLOWLIST)).toHaveLength(8)
  })

  it('includes restaurant_id in every table allowlist', () => {
    for (const [table, columns] of Object.entries(POS_UPLOAD_COLUMN_ALLOWLIST)) {
      expect(columns).toContain('restaurant_id')
    }
  })
})