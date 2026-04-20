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
  role: 'store_admin' | 'super_admin'
}

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

export { getServiceClient, RESTAURANT_ID }