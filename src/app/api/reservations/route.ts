import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESTAURANT_ID = 'a0000000-0000-0000-0000-000000000001'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUserId(request: NextRequest) {
  const sb = getServiceClient()
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const { data } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (data.user) return data.user.id
  }
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
  return user?.id ?? null
}

async function sendStatusEmail(sb: ReturnType<typeof getServiceClient>, reservationId: string, status: string) {
  const { sendReservationEmail } = await import('@/lib/email/send')

  // Get reservation with customer info
  const { data: reservation } = await sb
    .from('reservations')
    .select('*, customers(email, full_name)')
    .eq('id', reservationId)
    .single()

  if (!reservation || !reservation.customers?.email) return

  // Get zone name from table
  let zoneName = '—'
  if (reservation.table_id) {
    const { data: table } = await sb
      .from('tables')
      .select('zone_id')
      .eq('id', reservation.table_id)
      .single()
    if (table?.zone_id) {
      const { data: zone } = await sb
        .from('table_zones')
        .select('name')
        .eq('id', table.zone_id)
        .single()
      if (zone?.name) zoneName = zone.name
    }
  }

  await sendReservationEmail(
    {
      to: reservation.customers.email,
      customerName: reservation.customers.full_name || 'Cliente',
      date: reservation.date,
      timeStart: reservation.time_start,
      timeEnd: reservation.time_end,
      partySize: reservation.party_size,
      zoneName,
      specialRequests: reservation.special_requests,
    },
    status
  )
}

// POST - Create reservation
export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { date, time_start, time_end, party_size, special_requests } = body

  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get or create customer
  const { data: existing } = await sb
    .from('customers')
    .select('id, email, full_name')
    .eq('auth_user_id', userId)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  let customerId = existing?.id

  if (!customerId) {
    // Get user metadata for customer record
    const { data: { user: authUser } } = await sb.auth.getUser(userId)
    const { data: newCustomer } = await sb
      .from('customers')
      .insert({
        auth_user_id: userId,
        restaurant_id: RESTAURANT_ID,
        email: authUser?.email,
        full_name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name,
      })
      .select('id')
      .single()
    customerId = newCustomer?.id
  }

  if (!customerId) {
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }

  // ALWAYS resolve table from zone_id
  const zone = body.zone || body.zone_id
  let assignedTableId: string | null = null

  if (zone) {
    const { data: zoneTables } = await sb
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('zone_id', zone)
      .eq('is_active', true)
      .gte('capacity', party_size)
      .order('capacity', { ascending: true })
      .limit(1)

    if (zoneTables && zoneTables.length > 0) {
      assignedTableId = zoneTables[0].id
    }
  }

  const { data: reservation, error } = await sb
    .from('reservations')
    .insert({
      date,
      time_start,
      time_end,
      party_size,
      table_id: assignedTableId,
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

  // Send pending email
  sendStatusEmail(sb, reservation.id, 'pending').catch(e => console.error('Email error:', e))

  return NextResponse.json({ reservation })
}

// PATCH - Update reservation status (admin or owner can cancel)
export async function PATCH(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { reservation_id, status } = body

  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get the reservation to check ownership
  const { data: reservation } = await sb
    .from('reservations')
    .select('id, customer_id, status')
    .eq('id', reservation_id)
    .single()

  if (!reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  // Check if user is admin or owner
  const { data: customer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  const isOwner = customer?.id === reservation.customer_id

  // Get admin role
  const { data: { user: authUser } } = await sb.auth.getUser(userId)
  const isAdmin = authUser?.app_metadata?.role === 'super_admin' || authUser?.user_metadata?.role === 'super_admin'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Owners can only cancel their own reservations
  if (isOwner && !isAdmin && status !== 'cancelled') {
    return NextResponse.json({ error: 'Solo puedes cancelar tu reserva' }, { status: 403 })
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

  // Send email for status change
  sendStatusEmail(sb, reservation_id, status).catch(e => console.error('Email error:', e))

  return NextResponse.json({ reservation: data })
}

// GET - List reservations (user sees own, admin sees all)
export async function GET(request: NextRequest) {
  const sb = getServiceClient()
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: { user: authUser } } = await sb.auth.getUser(userId)
  const isAdmin = authUser?.app_metadata?.role === 'super_admin' || authUser?.user_metadata?.role === 'super_admin'

  if (isAdmin) {
    const { data, error } = await sb
      .from('reservations')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reservations: data })
  }

  // Regular user: get their customer id first
  const { data: customer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!customer) {
    return NextResponse.json({ reservations: [] })
  }

  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .eq('customer_id', customer.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservations: data })
}