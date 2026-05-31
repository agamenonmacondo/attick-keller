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

export interface AdminUser {
  id: string
  email?: string
  role: 'store_admin' | 'super_admin' | 'host' | 'lider_area' | 'colaborador' | 'reservante'
}

export interface HostUser {
  id: string
  email?: string
  role: 'host'
}

export type StaffUser = AdminUser

export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
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
  if (!user?.id) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin'])
    .single()

  if (!roleData) return null

  return {
    id: user.id,
    email: user.email,
    role: roleData.role as 'store_admin' | 'super_admin',
  }
}

export async function getHostUser(request: NextRequest): Promise<HostUser | null> {
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
  if (!user?.id) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .eq('role', 'host')
    .single()

  if (!roleData) return null

  return {
    id: user.id,
    email: user.email,
    role: 'host',
  }
}

export interface EmployeeUser {
  id: string
  email?: string
  role: 'lider_area' | 'colaborador' | 'reservante'
  pos_nomina_staff_id: string
}

export async function getEmployeeUser(request: NextRequest): Promise<EmployeeUser | null> {
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
  if (!user?.id) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role, pos_nomina_staff_id')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['lider_area', 'colaborador', 'reservante'])
    .single()

  if (!roleData || !roleData.pos_nomina_staff_id) return null

  return {
    id: user.id,
    email: user.email,
    role: roleData.role as 'lider_area' | 'colaborador' | 'reservante',
    pos_nomina_staff_id: roleData.pos_nomina_staff_id,
  }
}

export async function getStaffUser(request: NextRequest): Promise<StaffUser | null> {
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
  if (!user?.id) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'host'])
    .single()

  if (!roleData) return null

  return {
    id: user.id,
    email: user.email,
    role: roleData.role as AdminUser['role'],
  }
}

export async function getStaffOrLeaderUser(request: NextRequest): Promise<AdminUser | null> {
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
  if (!user?.id) return null

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'lider_area'])
    .single()

  if (!roleData) return null

  return {
    id: user.id,
    email: user.email,
    role: roleData.role as AdminUser['role'],
  }
}

export { getServiceClient, RESTAURANT_ID }