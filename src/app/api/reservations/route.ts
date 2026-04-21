import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser, getServiceClient as getAdminServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

const RESTAURANT_ID_LOCAL = 'a0000000-0000-0000-0000-000000000001'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const sb = getServiceClient()
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
  return user
}

async function sendStatusEmail(sb: ReturnType<typeof getServiceClient>, reservationId: string, status: string) {
  const { sendReservationEmail } = await import('@/lib/email/send')

  const { data: reservation } = await sb
    .from('reservations')
    .select('*, customers(email, full_name)')
    .eq('id', reservationId)
    .single()

  if (!reservation || !reservation.customers?.email) return

  let zoneName = '—'
  if (reservation.table_id) {
    const { data: table } = await sb.from('tables').select('zone_id').eq('id', reservation.table_id).single()
    if (table?.zone_id) {
      const { data: zone } = await sb.from('table_zones').select('name').eq('id', table.zone_id).single()
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

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Get or create customer
  let customerId: string | null = null

  // 1. Try by auth_user_id
  const { data: byAuth } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .maybeSingle()

  customerId = byAuth?.id ?? null

  // 2. Try by email (if auth_user_id didn't match)
  if (!customerId && user.email) {
    const { data: byEmail } = await sb
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .eq('restaurant_id', RESTAURANT_ID)
      .maybeSingle()

    customerId = byEmail?.id ?? null
  }

  // 3. Create new customer if not found
  if (!customerId) {
    const phoneValue = user.user_metadata?.phone || null
    const { data: newCustomer, error: customerError } = await sb
      .from('customers')
      .insert({
        auth_user_id: user.id,
        restaurant_id: RESTAURANT_ID,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        phone: phoneValue,
      })
      .select('id')
      .single()

    if (customerError) {
      // If duplicate key on phone, try to fetch existing by email one more time
      if (customerError.message?.includes('duplicate key') && user.email) {
        const { data: fallback } = await sb
          .from('customers')
          .select('id')
          .eq('email', user.email)
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle()

        if (fallback?.id) {
          // Update auth_user_id on the existing row so future lookups work
          await sb
            .from('customers')
            .update({ auth_user_id: user.id })
            .eq('id', fallback.id)

          customerId = fallback.id
        }
      }

      if (!customerId) {
        console.error('Customer insert error:', customerError)
        return NextResponse.json({ error: customerError.message || 'Error al crear cliente' }, { status: 500 })
      }
    } else {
      customerId = newCustomer?.id ?? null
    }
  }

  if (!customerId) return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })

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
    if (zoneTables && zoneTables.length > 0) assignedTableId = zoneTables[0].id
  }

  const { data: reservation, error } = await sb
    .from('reservations')
    .insert({
      date, time_start, time_end, party_size,
      table_id: assignedTableId,
      customer_id: customerId,
      restaurant_id: RESTAURANT_ID,
      status: 'pending',
      special_requests: special_requests || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendStatusEmail(sb, reservation.id, 'pending').catch(e => console.error('Email error:', e))
  return NextResponse.json({ reservation })
}

// PUT - Modify reservation (date, time, party_size, special_requests)
export async function PUT(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { reservation_id, date, time_start, time_end, party_size, special_requests, zone_id } = body

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Get reservation
  const { data: reservation } = await sb
    .from('reservations')
    .select('id, customer_id, status, date, time_start, time_end, party_size, special_requests, table_id')
    .eq('id', reservation_id)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  // Check ownership or admin
  const { data: customer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  const isOwner = customer?.id === reservation.customer_id
  const admin = await getAdminUser(request)

  if (!isOwner && !admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Only active reservations can be modified
  if (reservation.status === 'cancelled' || reservation.status === 'completed') {
    return NextResponse.json({ error: 'No se puede modificar una reserva cancelada o completada' }, { status: 400 })
  }

  // Build update object
  const updateData: Record<string, any> = {}
  if (date) updateData.date = date
  if (time_start) updateData.time_start = time_start
  if (time_end) updateData.time_end = time_end
  if (party_size) updateData.party_size = party_size
  if (special_requests !== undefined) updateData.special_requests = special_requests || null

  // If zone changed, reassign table
  if (zone_id) {
    const effectiveParty = party_size || reservation.party_size
    const { data: zoneTables } = await sb
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .gte('capacity', effectiveParty)
      .order('capacity', { ascending: true })
      .limit(1)
    if (zoneTables && zoneTables.length > 0) {
      updateData.table_id = zoneTables[0].id
    }
  }

  const { data, error } = await sb
    .from('reservations')
    .update(updateData)
    .eq('id', reservation_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send update email (re-use confirmed status to notify of changes)
  sendStatusEmail(sb, reservation_id, reservation.status).catch(e => console.error('Email error:', e))

  return NextResponse.json({ reservation: data })
}

// PATCH - Update reservation status
export async function PATCH(request: NextRequest) {
  const sb = getServiceClient()
  const body = await request.json()
  const { reservation_id, status } = body

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: reservation } = await sb
    .from('reservations')
    .select('id, customer_id, status, date, time_start, time_end, party_size, special_requests, table_id')
    .eq('id', reservation_id)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const { data: customer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  // Cancel = DELETE from system (no noise in dashboards)
  const isOwner = customer?.id === reservation.customer_id
  const admin = await getAdminUser(request)

  if (!isOwner && !admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Owners can only cancel; admins can change any status
  if (isOwner && !admin && status !== 'cancelled') {
    return NextResponse.json({ error: 'Solo puedes cancelar tu reserva' }, { status: 403 })
  }

  // If cancelling, update status (preserve row for audit/metrics)
  if (status === 'cancelled') {
    const { data, error } = await sb
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservation_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    sendStatusEmail(sb, reservation_id, 'cancelled').catch(e => console.error('Email error:', e))
    return NextResponse.json({ reservation: data })
  }

  // Other status changes (confirmed, completed)
  const { data, error } = await sb
    .from('reservations')
    .update({ status })
    .eq('id', reservation_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendStatusEmail(sb, reservation_id, status).catch(e => console.error('Email error:', e))
  return NextResponse.json({ reservation: data })
}

// GET - List reservations (admin sees all, user sees own)
export async function GET(request: NextRequest) {
  const sb = getServiceClient()
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = await getAdminUser(request)

  if (admin) {
    const { data, error } = await sb
      .from('reservations')
      .select('*, customers(email, full_name)')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reservations: data, isAdmin: true })
  }

  // Regular user: only active reservations (no cancelled/deleted)
  const { data: customer } = await sb
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!customer) return NextResponse.json({ reservations: [], isAdmin: false })

  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .eq('customer_id', customer.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reservations: data, isAdmin: false })
}