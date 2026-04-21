import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

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

  // Resolve table from zone if provided
  let tableId: string | null = null
  if (zone_id) {
    const { data: zoneTables } = await sb
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('zone_id', zone_id)
      .eq('is_active', true)
      .gte('capacity', party_size)
      .order('capacity', { ascending: true })
      .limit(1)
    if (zoneTables && zoneTables.length > 0) tableId = zoneTables[0].id
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
    const tablesArr = r.tables as unknown as Array<{ table_zones: Array<{ name: string }> }> | null
    const table = Array.isArray(tablesArr) ? tablesArr[0] : null
    const zoneArr = table?.table_zones
    const zone = Array.isArray(zoneArr) ? zoneArr[0] : null
    return { ...r, zone_name: zone?.name || null, table_zones: undefined, tables: undefined }
  })

  return NextResponse.json({ reservations, total: count || 0, page, limit })
}