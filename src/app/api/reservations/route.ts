import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser, getServiceClient as getAdminServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { getZoneLetter } from '@/lib/utils/zone-letter'

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

  const providedPhone = body.customer_phone || user.user_metadata?.phone || null

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

  // 2b. If found and user provided a real phone, update the placeholder
  if (customerId && providedPhone) {
    const { data: existingCustomer } = await sb
      .from('customers')
      .select('phone')
      .eq('id', customerId)
      .single()

    if (existingCustomer?.phone?.startsWith('pending_')) {
      await sb
        .from('customers')
        .update({ phone: providedPhone })
        .eq('id', customerId)
    }
  }

  // 3. Create new customer if not found
  if (!customerId) {
    const phoneValue = providedPhone || `pending_${user.id}`
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
      if (customerError.message?.includes('duplicate key')) {
        // Try matching by email first
        if (user.email) {
          const { data: fallback } = await sb
            .from('customers')
            .select('id, auth_user_id')
            .eq('email', user.email)
            .eq('restaurant_id', RESTAURANT_ID)
            .maybeSingle()

          if (fallback?.id) {
            if (fallback.auth_user_id === user.id) {
              customerId = fallback.id
            } else {
              // Same email, different user — link this user to the existing customer
              await sb
                .from('customers')
                .update({ auth_user_id: user.id })
                .eq('id', fallback.id)
              customerId = fallback.id
            }
          }
        }

        // If not found by email, try matching by phone
        if (!customerId && providedPhone) {
          const { data: byPhone } = await sb
            .from('customers')
            .select('id, auth_user_id')
            .eq('phone', providedPhone)
            .eq('restaurant_id', RESTAURANT_ID)
            .maybeSingle()

          if (byPhone?.id) {
            if (byPhone.auth_user_id === user.id) {
              customerId = byPhone.id
            } else {
              // Same phone, different user — create a new customer record
              // (phone uniqueness constraint removed, so this is allowed)
              const phoneValue = providedPhone || `pending_${user.id}`
              const { data: newCust, error: retryError } = await sb
                .from('customers')
                .insert({
                  auth_user_id: user.id,
                  restaurant_id: RESTAURANT_ID,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
                  phone: phoneValue,
                })
                .select('id')
                .maybeSingle()

              if (!retryError && newCust?.id) {
                customerId = newCust.id
              }
            }
          }
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

  let assignedTableId: string | null = null

  // ── Auto-assign table using the algorithm ──
  // 1. Fetch all active tables with zone info (try with letter column, fallback without)
  let allTables: unknown = null
  {
    const res = await sb
      .from('tables')
      .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name, letter)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
    if (res.error) {
      // Fallback: query without letter column (may not exist in DB yet)
      const res2 = await sb
        .from('tables')
        .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name)')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
      allTables = res2.data
    } else {
      allTables = res.data
    }
  }

  // 2. Fetch existing reservations for the same date that overlap
  const { data: existingReservations } = await sb
    .from('reservations')
    .select('table_id, time_start, time_end')
    .eq('date', date)
    .neq('status', 'cancelled')
    .not('table_id', 'is', null)

  // 3. Fetch table combinations
  const { data: combinations } = await sb
    .from('table_combinations')
    .select('id, table_ids, combined_capacity, is_active, name')
    .eq('is_active', true)

  // 4. Fetch zone scores from corrections (if any)
  // For now, use default ZONE_SCORES

  // 5. Run the algorithm
  type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; zone: { id: string; name: string; letter?: string | null } | null }
  const availableTables = (allTables as unknown as TableRow[] | null)?.map(t => ({
    id: t.id,
    number: t.number,
    zone_letter: t.zone?.letter ?? getZoneLetter(t.zone?.name),
    zone_name: t.zone?.name ?? 'Sin zona',
    capacity: t.capacity,
    capacity_min: t.capacity_min ?? t.capacity,
    can_combine: t.can_combine ?? false,
    combine_group: t.combine_group ?? null,
    floor_num: 1,
  })) ?? []

  const existingResList = (existingReservations as { table_id: string; time_start: string; time_end: string }[] | null) ?? []
  type ComboRow = { id: string; table_ids: string[]; combined_capacity: number; is_active: boolean; name: string | null }
  const combosList = (combinations as unknown as ComboRow[] | null) ?? []

  const { assignTable } = await import('@/lib/algorithms/table-assignment')

  const result = assignTable({
    reservation: {
      id: 'new',
      party_size,
      date,
      time_start,
      time_end,
    },
    available_tables: availableTables,
    existing_reservations: existingResList,
    combinations: combosList,
  })

  assignedTableId = result.suggested_table_id

  const { data: reservation, error } = await sb
    .from('reservations')
    .insert({
      date, time_start, time_end, party_size,
      table_id: assignedTableId,
      customer_id: customerId,
      restaurant_id: RESTAURANT_ID,
      status: 'confirmed',
      special_requests: special_requests || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendStatusEmail(sb, reservation.id, 'confirmed').catch(e => console.error('Email error:', e))
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

  // If zone changed or party_size changed, reassign table using algorithm
  if (zone_id || party_size) {
    const effectiveDate = date || reservation.date
    const effectiveTimeStart = time_start || reservation.time_start
    const effectiveTimeEnd = time_end || reservation.time_end
    const effectiveParty = party_size || reservation.party_size

    const [tablesRes, reservationsRes, combosRes] = await Promise.all([
      sb.from('tables')
        .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name, letter)')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true),
      sb.from('reservations')
        .select('table_id, time_start, time_end')
        .eq('date', effectiveDate)
        .neq('status', 'cancelled')
        .not('table_id', 'is', null),
      sb.from('table_combinations')
        .select('id, table_ids, combined_capacity, is_active, name')
        .eq('is_active', true),
    ])

    // Fallback without letter column if the primary query fails
    let tableRows: unknown[] | null = tablesRes.data as unknown[] | null
    if (tablesRes.error) {
      const res2 = await sb.from('tables')
        .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name)')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
      tableRows = res2.data
    }

    type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; zone: { id: string; name: string; letter?: string | null } | null }
    const availableTables = (tableRows as unknown as TableRow[] | null)?.map(t => ({
      id: t.id,
      number: t.number,
      zone_letter: t.zone?.letter ?? getZoneLetter(t.zone?.name),
      zone_name: t.zone?.name ?? 'Sin zona',
      capacity: t.capacity,
      capacity_min: t.capacity_min ?? t.capacity,
      can_combine: t.can_combine ?? false,
      combine_group: t.combine_group ?? null,
      floor_num: 1,
    })) ?? []

    const existingResList = (reservationsRes.data as { table_id: string; time_start: string; time_end: string }[] | null) ?? []
    type ComboRow = { id: string; table_ids: string[]; combined_capacity: number; is_active: boolean; name: string | null }
    const combosList = (combosRes.data as unknown as ComboRow[] | null) ?? []

    const { assignTable } = await import('@/lib/algorithms/table-assignment')

    const result = assignTable({
      reservation: {
        id: reservation_id,
        party_size: effectiveParty,
        date: effectiveDate,
        time_start: effectiveTimeStart,
        time_end: effectiveTimeEnd,
      },
      available_tables: availableTables,
      existing_reservations: existingResList,
      combinations: combosList,
    })

    if (result.suggested_table_id) {
      updateData.table_id = result.suggested_table_id
    } else {
      updateData.table_id = null
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

  // If seating and no table assigned yet, auto-assign using the algorithm
  const updateData: Record<string, unknown> = { status }
  if (status === 'seated' && !reservation.table_id) {
    let allTables: unknown = null
    {
      const res = await sb
        .from('tables')
        .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name, letter)')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true)
      if (res.error) {
        const res2 = await sb
          .from('tables')
          .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name)')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('is_active', true)
        allTables = res2.data
      } else {
        allTables = res.data
      }
    }

    const { data: existingReservations } = await sb
      .from('reservations')
      .select('table_id, time_start, time_end')
      .eq('date', reservation.date)
      .neq('status', 'cancelled')
      .not('table_id', 'is', null)

    const { data: combinations } = await sb
      .from('table_combinations')
      .select('id, table_ids, combined_capacity, is_active, name')
      .eq('is_active', true)

    type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; zone: { id: string; name: string; letter?: string | null } | null }
    const availableTables = (allTables as unknown as TableRow[] | null)?.map(t => ({
      id: t.id,
      number: t.number,
      zone_letter: t.zone?.letter ?? getZoneLetter(t.zone?.name),
      zone_name: t.zone?.name ?? 'Sin zona',
      capacity: t.capacity,
      capacity_min: t.capacity_min ?? t.capacity,
      can_combine: t.can_combine ?? false,
      combine_group: t.combine_group ?? null,
      floor_num: 1,
    })) ?? []

    const existingResList = (existingReservations as { table_id: string; time_start: string; time_end: string }[] | null) ?? []
    type ComboRow = { id: string; table_ids: string[]; combined_capacity: number; is_active: boolean; name: string | null }
    const combosList = (combinations as unknown as ComboRow[] | null) ?? []

    const { assignTable } = await import('@/lib/algorithms/table-assignment')

    const result = assignTable({
      reservation: {
        id: reservation.id,
        party_size: reservation.party_size,
        date: reservation.date,
        time_start: reservation.time_start,
        time_end: reservation.time_end,
      },
      available_tables: availableTables,
      existing_reservations: existingResList,
      combinations: combosList,
    })

    if (result.suggested_table_id) {
      updateData.table_id = result.suggested_table_id
    }
  }

  const { data, error } = await sb
    .from('reservations')
    .update(updateData)
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