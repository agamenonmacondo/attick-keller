import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  pre_paid: ['confirmed', 'no_show'],
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated: ['completed'],
  // completed, cancelled, no_show are terminal states
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()
  const body = await request.json()
  const { status, date, time_start, time_end, party_size, special_requests, zone_id, table_id } = body

  const { data: reservation } = await sb
    .from('reservations')
    .select('id, status, date, time_start, time_end, party_size, special_requests, table_id')
    .eq('id', id)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  // Status transition with validation
  if (status && status !== reservation.status) {
    const allowed = ALLOWED_TRANSITIONS[reservation.status as string]
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json({ error: `Transicion no permitida: ${reservation.status} → ${status}` }, { status: 400 })
    }
    updateData.status = status
  }

  // Host role restrictions: can only update status and table_id
  const isHost = staff.role === 'host'
  if (isHost) {
    // Host can only change status and table_id
    if (table_id !== undefined) {
      updateData.table_id = table_id || null
    }
  } else {
    // Admin/store_admin can update all fields
    if (date) updateData.date = date
    if (time_start) updateData.time_start = time_start
    if (time_end) updateData.time_end = time_end
    if (party_size) updateData.party_size = party_size
    if (special_requests !== undefined) updateData.special_requests = special_requests || null
    if (table_id !== undefined) updateData.table_id = table_id || null

    if (zone_id) {
      const effectiveParty = (party_size as number) || reservation.party_size
      const { data: zoneTables } = await sb
        .from('tables').select('id, capacity').eq('restaurant_id', RESTAURANT_ID).eq('zone_id', zone_id).eq('is_active', true).gte('capacity', effectiveParty).order('capacity', { ascending: true }).limit(1)
      if (zoneTables && zoneTables.length > 0) updateData.table_id = zoneTables[0].id
    }
  }

  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  const { data, error } = await sb.from('reservations').update(updateData).eq('id', id).select('*, customers(email, full_name, phone)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status && status !== reservation.status) {
    const { sendReservationEmail } = await import('@/lib/email/send')
    const r = data as Record<string, unknown>
    const customerArr = r.customers as unknown as Array<{ email: string; full_name: string }> | null
    const customer = Array.isArray(customerArr) ? customerArr[0] : null
    let zoneName = '—'
    if (r.table_id) {
      const { data: table } = await sb.from('tables').select('zone_id').eq('id', r.table_id as string).single()
      if (table?.zone_id) {
        const { data: zone } = await sb.from('table_zones').select('name').eq('id', table.zone_id).single()
        if (zone?.name) zoneName = zone.name
      }
    }
    if (customer?.email) {
      sendReservationEmail({ to: customer.email, customerName: customer.full_name || 'Cliente', date: r.date as string, timeStart: r.time_start as string, timeEnd: r.time_end as string, partySize: r.party_size as number, zoneName, specialRequests: r.special_requests as string | null }, status).catch(e => console.error('Email error:', e))
    }
  }

  return NextResponse.json({ reservation: data })
}