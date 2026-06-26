import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError } from '@/lib/utils/api-security'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await sb
    .from('table_zones')
    .select('id, name')
    .eq('restaurant_id', 'a0000000-0000-0000-0000-000000000001')
    .order('name')

  if (error) {
    return handleApiError(error, 'zones')
  }

  return NextResponse.json({ zones: data })
}