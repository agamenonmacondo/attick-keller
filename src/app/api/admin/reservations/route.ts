import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { assignTable } from '@/lib/algorithms/table-assignment'
import { getZoneLetter } from '@/lib/utils/zone-letter'

export async function POST(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { date, time_start, time_end, party_size, special_requests, customer_id, customer_name, customer_phone, zone_id, source } = body

  if (!date || !time_start || !time_end || !party_size) {
    return NextResponse.json({ error: 'Campos requeridos: fecha, hora inicio, hora fin, numero de invitados' }, { status: 400 })
  }

  if (!customer_id && !customer_name) {
    return NextResponse.json({ error: 'Se requiere customer_id o customer_name' }, { status: 400 })
  }

  // Resolve or create customer for walk-ins
  let resolvedCustomerId = customer_id
  if (!resolvedCustomerId && customer_name) {
    // Check if customer exists by phone (if provided)
    if (customer_phone) {
      const { data: existing } = await sb
        .from('customers')
        .select('id')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('phone', customer_phone)
        .limit(1)
      if (existing && existing.length > 0) {
        resolvedCustomerId = existing[0].id
      }
    }
    // Create new customer if not found
    if (!resolvedCustomerId) {
      const { data: newCustomer, error: custError } = await sb
        .from('customers')
        .insert({
          restaurant_id: RESTAURANT_ID,
          full_name: customer_name,
          phone: customer_phone || null,
          email: null,
        })
        .select('id')
        .single()
      if (custError || !newCustomer) {
        return NextResponse.json({ error: 'Error creando cliente' }, { status: 500 })
      }
      resolvedCustomerId = newCustomer.id
    }
  }

  // Assign table using the algorithm (same as customer reservation flow)
  let tableId: string | null = null
  {
    const [tablesRes, reservationsRes, combosRes] = await Promise.all([
      sb.from('tables')
        .select('id, number, capacity, capacity_min, can_combine, combine_group, zone:table_zones!zone_id(id, name, letter)')
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('is_active', true),
      sb.from('reservations')
        .select('table_id, time_start, time_end')
        .eq('date', date)
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
      tableRows = res2.data as unknown[] | null
    }

    type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; zone: { id: string; name: string; letter?: string | null } | null }
    type ComboRow = { id: string; table_ids: string[]; combined_capacity: number; is_active: boolean; name: string | null }

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
    const combosList = (combosRes.data as unknown as ComboRow[] | null) ?? []

    // Build zone score override if zone_id is specified
    // Map zone_id to zone_letter for the algorithm
    let customZoneScores: Record<string, number> | undefined
    if (zone_id) {
      // Find the zone letter for the requested zone
      const requestedZone = zone_id
        ? (await sb.from('table_zones').select('id, name, letter').eq('id', zone_id).single()).data
        : undefined
      const requestedZoneLetter = requestedZone?.letter ?? getZoneLetter(requestedZone?.name)
      if (requestedZoneLetter) {
        // Boost the preferred zone score significantly
        customZoneScores = { A: 1, B: 1, C: 1, D: 1, E: 1 }
        customZoneScores[requestedZoneLetter] = 5  // strong preference for requested zone
      }
    }

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
      zone_scores: customZoneScores,
    })

    if (result.suggested_table_id) {
      tableId = result.suggested_table_id
    }
  }

  const { data: reservation, error } = await sb
    .from('reservations')
    .insert({
      restaurant_id: RESTAURANT_ID,
      customer_id: resolvedCustomerId,
      date,
      time_start,
      time_end,
      party_size,
      table_id: tableId,
      status: 'confirmed',
      source: source || 'phone',
      special_requests: special_requests || null,
    })
    .select('id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send confirmation email
  const r = reservation as Record<string, unknown>
  const customerArr = r.customers as unknown as Array<{ email: string; full_name: string }> | null
  const customer = Array.isArray(customerArr) ? customerArr[0] : null
  if (customer?.email) {
    try {
      const { sendReservationEmail } = await import('@/lib/email/send')
      let zoneName = '—'
      if (r.table_id) {
        const { data: table } = await sb.from('tables').select('zone_id').eq('id', r.table_id as string).single()
        if (table?.zone_id) {
          const { data: zone } = await sb.from('table_zones').select('name').eq('id', table.zone_id).single()
          if (zone?.name) zoneName = zone.name
        }
      }
      sendReservationEmail({
        to: customer.email,
        customerName: customer.full_name || 'Cliente',
        date: r.date as string,
        timeStart: r.time_start as string,
        timeEnd: r.time_end as string,
        partySize: r.party_size as number,
        zoneName,
        specialRequests: r.special_requests as string | null,
      }, 'confirmed').catch(e => console.error('Email error:', e))
    } catch {
      // Email send failure is non-blocking
    }
  }

  return NextResponse.json({ reservation }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)

  const date = url.searchParams.get('date')
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = sb
    .from('reservations')
    .select('id, date, time_start, time_end, party_size, status, source, special_requests, customer_id, table_id, created_at, customers(id, email, full_name, phone), tables(id, zone_id, table_zones(id, name))', { count: 'exact' })
    .eq('restaurant_id', RESTAURANT_ID)
    .order('date', { ascending: false })
    .range(from, to)

  if (date) query = query.eq('date', date)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reservations = (data || []).map(r => {
    const tablesRaw = r.tables as unknown as Array<{ table_zones: Array<{ name: string }> }> | { table_zones: Array<{ name: string }> | { name: string } } | null
    const table = Array.isArray(tablesRaw) ? tablesRaw[0] : tablesRaw
    const zoneArr = table?.table_zones
    const zone = Array.isArray(zoneArr) ? zoneArr[0] : zoneArr as { name: string } | null
    return { ...r, zone_name: zone?.name || null, table_zones: undefined, tables: undefined }
  })

  return NextResponse.json({ reservations, total: count || 0, page, limit })
}