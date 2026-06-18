import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { assignTable } from '@/lib/algorithms/table-assignment'
import { getZoneLetter } from '@/lib/utils/zone-letter'
import { logReservationChanges, ReservationLogEntry } from '@/lib/utils/reservation-logger'
import { getBlockedTableIds } from '@/lib/utils/table-blocks'

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
  const { status, date, time_start, time_end, party_size, special_requests, zone_id, table_id, table_ids, combined_capacity, zone_names } = body

  const { data: reservation } = await sb
    .from('reservations')
    .select('id, status, date, time_start, time_end, party_size, special_requests, table_id, table_combination_id')
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  // ─── Multi-zona: crear table_combination desde el popup ───
  if (table_ids && Array.isArray(table_ids) && table_ids.length > 1) {
    const effectiveParty = party_size || reservation.party_size
    const cap = combined_capacity || table_ids.length * 2  // fallback
    const name = zone_names
      ? `Evento ${effectiveParty}p — ${zone_names}`
      : `Evento ${effectiveParty}p — Multi-zona`

    const { data: combo, error: comboErr } = await sb
      .from('table_combinations')
      .insert({
        restaurant_id: RESTAURANT_ID,
        table_ids,
        combined_capacity: cap,
        is_active: true,
        name,
      })
      .select('id')
      .single()

    if (comboErr || !combo) {
      return NextResponse.json({ error: 'Error creando combinación de mesas' }, { status: 500 })
    }

    updateData.table_combination_id = combo.id
    updateData.table_id = null

    // Skip the rest of the update logic — apply directly
    const { data, error } = await sb.from('reservations').update(updateData).eq('id', id).select('*, customers(email, full_name, phone)').single()
    if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

    // Audit log
    await logReservationChanges([{
      reservation_id: id,
      action: 'table_changed',
      field_name: 'table_combination_id',
      old_value: reservation.table_combination_id as string | null,
      new_value: combo.id,
      performed_by_name: staff.email || 'Admin',
    }]).catch(e => console.error('[audit-log] Error:', e))

    return NextResponse.json({ reservation: data })
  }

  // Status transition with validation
  if (status && status !== reservation.status) {
    const allowed = ALLOWED_TRANSITIONS[reservation.status as string]
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json({ error: `Transicion no permitida: ${reservation.status} → ${status}` }, { status: 400 })
    }
    updateData.status = status
    // Track seated_at timestamp
    if (status === 'seated') {
      updateData.seated_at = new Date().toISOString()
    } else if (status === 'completed') {
      // Keep seated_at for reporting — don't null it
    }
    // Clear seated_at when reverting from seated to a pre-seated state
    if (['pending', 'confirmed', 'cancelled', 'no_show'].includes(status) && reservation.status === 'seated') {
      updateData.seated_at = null
    }
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

      // Fetch blocked tables for this date/time
      const blockedTableIds = await getBlockedTableIds(effectiveDate, effectiveTimeStart, effectiveTimeEnd)

      // Fetch all active tables with zone info
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

      // Fallback: re-query without letter column if it doesn't exist yet
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
      // Exclude the current reservation's table from the overlap check
      const otherResList = existingResList.filter(r => r.table_id !== reservation.table_id)
      const combosList = (combosRes.data as unknown as ComboRow[] | null) ?? []

      // Build zone score override if zone_id is specified
      let customZoneScores: Record<string, number> | undefined
      if (zone_id) {
        const requestedZoneData = zone_id
          ? (await sb.from('table_zones').select('id, name, letter').eq('id', zone_id).single()).data
          : undefined
        const requestedZoneLetter = requestedZoneData?.letter ?? getZoneLetter(requestedZoneData?.name)
        if (requestedZoneLetter) {
          customZoneScores = { A: 1, B: 1, C: 1, D: 1, E: 1 }
          customZoneScores[requestedZoneLetter] = 5
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
        blocked_table_ids: blockedTableIds,
      })

      if (result.suggested_table_id) {
        updateData.table_id = result.suggested_table_id
        updateData.table_combination_id = null
      } else if (result.event_multi_zone && result.event_multi_zone.fits && result.event_multi_zone.zones.length > 1) {
        // ─── Multi-mesa para eventos: crear table_combination dinámico ───
        const allTableIds = result.event_multi_zone.zones.flatMap(z => z.available_table_ids)
        const totalCap = result.event_multi_zone.combined_available
        const zoneNames = result.event_multi_zone.zones.map(z => `${z.zone_name}(${z.zone_letter})`).join('+')

        const { data: combo, error: comboErr } = await sb
          .from('table_combinations')
          .insert({
            restaurant_id: RESTAURANT_ID,
            table_ids: allTableIds,
            combined_capacity: totalCap,
            is_active: true,
            name: `Evento ${effectiveParty}p — ${zoneNames}`,
          })
          .select('id')
          .single()

        if (!comboErr && combo) {
          updateData.table_combination_id = combo.id
          updateData.table_id = null
        } else {
          updateData.table_id = null
          updateData.table_combination_id = null
        }
      } else {
        // No suitable table found; clear table assignment
        updateData.table_id = null
        updateData.table_combination_id = null
      }
    }
  }

  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  const { data, error } = await sb.from('reservations').update(updateData).eq('id', id).select('*, customers(email, full_name, phone)').single()
  if (error) return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })

  // Build audit trail for every change
  const logs: ReservationLogEntry[] = []
  const logAuthor = staff.email || 'Admin'

  if (updateData.status && updateData.status !== reservation.status) {
    const actionMap: Record<string, string> = {
      seated: 'seated', cancelled: 'cancelled', no_show: 'no_show', completed: 'completed',
    }
    logs.push({
      reservation_id: id,
      action: actionMap[updateData.status as string] || 'status_changed',
      field_name: 'status',
      old_value: reservation.status as string,
      new_value: updateData.status as string,
      performed_by_name: logAuthor,
    })
  }
  if (updateData.table_id !== undefined && updateData.table_id !== reservation.table_id) {
    logs.push({
      reservation_id: id,
      action: 'table_changed',
      field_name: 'table_id',
      old_value: reservation.table_id as string | null,
      new_value: (updateData.table_id as string) || null,
      performed_by_name: logAuthor,
    })
  }
  if (updateData.time_start && updateData.time_start !== reservation.time_start) {
    logs.push({
      reservation_id: id,
      action: 'time_changed',
      field_name: 'time_start',
      old_value: reservation.time_start as string,
      new_value: updateData.time_start as string,
      performed_by_name: logAuthor,
    })
  }
  if (updateData.time_end && updateData.time_end !== reservation.time_end) {
    logs.push({
      reservation_id: id,
      action: 'time_changed',
      field_name: 'time_end',
      old_value: (reservation as any).time_end as string,
      new_value: updateData.time_end as string,
      performed_by_name: logAuthor,
    })
  }
  if (updateData.party_size && updateData.party_size !== reservation.party_size) {
    logs.push({
      reservation_id: id,
      action: 'party_size_changed',
      field_name: 'party_size',
      old_value: String(reservation.party_size),
      new_value: String(updateData.party_size),
      performed_by_name: logAuthor,
    })
  }

  // Fire and forget — don't block the response
  if (logs.length > 0) {
    logReservationChanges(logs).catch(e => console.error('[audit-log] Error:', e))
  }

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