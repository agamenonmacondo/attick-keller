import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ roles: [], area: null })

  const sb = getServiceClient()
  const { data: rolesData } = await sb
    .from('user_roles')
    .select('role, area')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin', 'host', 'lider_area', 'colaborador', 'reservante'])

  const roles = (rolesData || []).map(r => r.role)
  // Area filtering: super_admin and store_admin should see ALL areas, not be locked to one
  const isAdminRole = roles.includes('super_admin') || roles.includes('store_admin')
  // Tomar la primera area no-null (solo lider_area la necesita para filtrar)
  const area = isAdminRole ? null : ((rolesData || []).find(r => r.area)?.area ?? null)

  return NextResponse.json({ roles, area })
}
