import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { assignTable } from '@/lib/algorithms/table-assignment'

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

    // Zone + table reassignment using algorithm (checks availability & time overlaps)
    if (zone_id || (party_size && party_size !== reservation.party_size) || (time_start && time_start !== reservation.time_start) || (time_end && time_end !== reservation.time_end)) {
      // Determine effective values (use new values if provided, else fall back to existing)
      const effectiveParty = (party_size as number) || reservation.party_size
      const effectiveDate = (date as string) || reservation.date
      const effectiveTimeStart = (time_start as string) || reservation.time_start
      const effectiveTimeEnd = (time_end as string) || reservation.time_end

      // Fetch all active tables with zone info
      const [tablesRes, reservationsRes, combosRes] = await Promise.all([
        sb.from('tables')
          .select('id, number, capacity, capacity_min, can_combine, combine_group, floor_num, zone:table_zones!zone_id(id, name, letter)')
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

      type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; floor_num: number | null; zone: { id: string; name: string; letter: string } | null }
      type ComboRow = { id: string; table_ids: string[]; combined_capacity: number; is_active: boolean; name: string | null }

      const availableTables = (tablesRes.data as unknown as TableRow[] | null)?.map(t => ({
        id: t.id,
        number: t.number,
        zone_letter: t.zone?.letter ?? 'E',
        zone_name: t.zone?.name ?? 'Sin zona',
        capacity: t.capacity,
        capacity_min: t.capacity_min ?? t.capacity,
        can_combine: t.can_combine ?? false,
        combine_group: t.combine_group ?? null,
        floor_num: t.floor_num ?? 1,
      })) ?? []

      const existingResList = (reservationsRes.data as { table_id: string; time_start: string; time_end: string }[] | null) ?? []
      // Exclude the current reservation's table from the overlap check
      const otherResList = existingResList.filter(r => r.table_id !== reservation.table_id)
      const combosList = (combosRes.data as unknown as ComboRow[] | null) ?? []

      // Build zone score override if zone_id is specified
      let customZoneScores: Record<string, number> | undefined
      if (zone_id) {
        const requestedZone = zone_id
          ? (await sb.from('table_zones').select('letter').eq('id', zone_id).single()).data?.letter
          : undefined
        if (requestedZone) {
          customZoneScores = { A: 1, B: 1, C: 1, D: 1, E: 1 }
          customZoneScores[requestedZone] = 5
        }
      }

      const result = assignTable({
        reservation: {
          id: reservation.id,
          party_size: effectiveParty,
          date: effectiveDate,
          time_start: effectiveTimeStart,
          time_end: effectiveTimeEnd,
        },
        available_tables: availableTables,
        existing_reservations: otherResList,
        combinations: combosList,
        zone_scores: customZoneScores,
      })

      if (result.suggested_table_id) {
        updateData.table_id = result.suggested_table_id
      } else {
        // No suitable table found; clear table assignment
        updateData.table_id = null
      }
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