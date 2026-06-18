import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { RESTAURANT_ID } from '@/lib/utils/constants'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Shared role-priority logic ──
const ROLE_PRIORITY = ['super_admin', 'store_admin', 'host', 'lider_area', 'colaborador', 'reservante'] as const

function pickBestRole(roles: { role: string }[]): string | null {
  for (const p of ROLE_PRIORITY) {
    if (roles.some(r => r.role === p)) return p
  }
  return roles[0]?.role ?? null
}

// ── Interfaces ──
export interface AdminUser {
  id: string
  email?: string
  role: 'store_admin' | 'super_admin' | 'host' | 'lider_area' | 'colaborador' | 'reservante'
  area?: string | null
}

export interface HostUser {
  id: string
  email?: string
  role: 'host'
}

export interface EmployeeUser {
  id: string
  email?: string
  role: 'lider_area' | 'colaborador' | 'reservante'
  pos_nomina_staff_id: string
}

export type StaffUser = AdminUser

// ── Helper: extract Supabase auth user from request cookies ──
async function getAuthUser(request: NextRequest) {
  const cookieStore = request.cookies
  const serverSb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll().map(c => ({ name: c.name, value: c.value })) },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await serverSb.auth.getUser()
  return user?.id ? { id: user.id, email: user.email } : null
}

// ── getAdminUser: super_admin + store_admin (no area) ──
export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin'])

  if (!roleData || roleData.length === 0) return null

  const bestRole = pickBestRole(roleData)
  if (!bestRole) return null

  return {
    id: authUser.id,
    email: authUser.email,
    role: bestRole as 'store_admin' | 'super_admin',
  }
}

// ── getHostUser: host only ──
export async function getHostUser(request: NextRequest): Promise<HostUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .eq('role', 'host')

  if (!roleData || roleData.length === 0) return null

  return {
    id: authUser.id,
    email: authUser.email,
    role: 'host',
  }
}

// ── getEmployeeUser: lider_area, colaborador, reservante (requires pos_nomina_staff_id) ──
export async function getEmployeeUser(request: NextRequest): Promise<EmployeeUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role, pos_nomina_staff_id')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['lider_area', 'colaborador', 'reservante'])

  if (!roleData || roleData.length === 0) return null

  const bestRole = pickBestRole(roleData)
  if (!bestRole) return null

  // Find the row matching bestRole to get pos_nomina_staff_id
  const bestRow = roleData.find((r: { role: string }) => r.role === bestRole)
  const staffId = bestRow?.pos_nomina_staff_id ?? roleData[0]?.pos_nomina_staff_id
  if (!staffId) return null

  return {
    id: authUser.id,
    email: authUser.email,
    role: bestRole as 'lider_area' | 'colaborador' | 'reservante',
    pos_nomina_staff_id: staffId,
  }
}

// ── getStaffUser: super_admin + store_admin + host (no lider_area) ──
export async function getStaffUser(request: NextRequest): Promise<StaffUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'host'])

  if (!roleData || roleData.length === 0) return null

  const bestRole = pickBestRole(roleData)
  if (!bestRole) return null

  return {
    id: authUser.id,
    email: authUser.email,
    role: bestRole as AdminUser['role'],
  }
}

// ── getStaffOrLeaderUser: super_admin + store_admin + lider_area (includes area for lider_area) ──
export async function getStaffOrLeaderUser(request: NextRequest): Promise<AdminUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role, area')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'lider_area'])

  if (!roleData || roleData.length === 0) return null

  const bestRole = pickBestRole(roleData)
  if (!bestRole) return null

  // Find area from lider_area role if present
  const leaderRow = roleData.find((r: { role: string }) => r.role === 'lider_area')
  const area = leaderRow?.area ?? null

  return {
    id: authUser.id,
    email: authUser.email,
    role: bestRole as AdminUser['role'],
    area,
  }
}

// ── getAdminOrLeaderUser: super_admin + store_admin + lider_area (with area) ──
// Same as getStaffOrLeaderUser but returns area for filtering
export async function getAdminOrLeaderUser(request: NextRequest): Promise<AdminUser | null> {
  const authUser = await getAuthUser(request)
  if (!authUser) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role, area')
    .eq('auth_user_id', authUser.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'lider_area'])

  if (!roleData || roleData.length === 0) return null

  const bestRole = pickBestRole(roleData)
  if (!bestRole) return null

  // Find area from lider_area role if present
  const leaderRow = roleData.find((r: { role: string }) => r.role === 'lider_area')
  const area = leaderRow?.area ?? null

  return {
    id: authUser.id,
    email: authUser.email,
    role: bestRole as AdminUser['role'],
    area,
  }
}

export { getServiceClient, RESTAURANT_ID }