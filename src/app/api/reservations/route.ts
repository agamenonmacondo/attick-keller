import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Create reservation
export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { date, time_start, time_end, party_size, table_id, special_requests } = body

  // Get auth user from request headers
  const authHeader = request.headers.get('authorization')
  let userId: string | null = null
  if (authHeader) {
    const { data } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    userId = data.user?.id ?? null
  }

  if (!userId) {
    // Try to get from cookie-based client
    const { createServerClient } = await import('@supabase/ssr')
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
    userId = user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get or create customer
  const { data: existing } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  let customerId = existing?.id

  if (!customerId) {
    const { data: newCustomer } = await sb
      .from('customers')
      .insert({
        auth_user_id: userId,
        restaurant_id: RESTAURANT_ID,
      })
      .select('id')
      .single()
    customerId = newCustomer?.id
  }

  if (!customerId) {
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }

  const { data: reservation, error } = await sb
    .from('reservations')
    .insert({
      date,
      time_start,
      time_end,
      party_size,
      table_id: table_id || null,
      customer_id: customerId,
      restaurant_id: RESTAURANT_ID,
      status: 'pending',
      special_requests: special_requests || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservation })
}

// PATCH - Update reservation status (admin only)
export async function PATCH(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { reservation_id, status } = body

  // Verify admin
  const { createServerClient } = await import('@supabase/ssr')
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
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data, error } = await sb
    .from('reservations')
    .update({ status })
    .eq('id', reservation_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservation: data })
}

// GET - List reservations (admin)
export async function GET(request: NextRequest) {
  const sb = getServiceClient()
  
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservations: data })
}