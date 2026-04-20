import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ role: null })

  const sb = getServiceClient()
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .in('role', ['store_admin', 'super_admin'])
    .single()

  return NextResponse.json({ role: roleData?.role ?? null })
}