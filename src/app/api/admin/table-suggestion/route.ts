import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { assignTable, type AssignmentInput } from '@/lib/algorithms/table-assignment'
import { getZoneLetter } from '@/lib/utils/zone-letter'

/**
 * POST /api/admin/table-suggestion
 *
 * Given a reservation ID, run the table-assignment algorithm and return
 * the suggested table + alternatives so the host can accept or override.
 *
 * Body: { reservation_id: string }
 * Response: AssignmentResult (suggested_table_id, alternatives, score, breakdown, reason)
 *
 * ---
 *
 * PUT /api/admin/table-suggestion
 *
 * Log a suggestion correction (host overrode the algorithm suggestion).
 * This feeds the auto-learning system (FASE 6).
 *
 * Body: { reservation_id: string, suggested_table_id: string, actual_table_id: string }
 * Response: { ok: true }
 */
export async function PUT(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { reservation_id, suggested_table_id, actual_table_id } = body

  if (!reservation_id || !suggested_table_id || !actual_table_id) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // Same table → no correction, skip logging
  if (suggested_table_id === actual_table_id) {
    return NextResponse.json({ ok: true, correction: false })
  }

  const sb = getServiceClient()

  // Get zone info for both tables (with fallback if letter column missing)
  const [suggestedTable, actualTable] = await Promise.all([
    sb.from('tables').select('id, zone:table_zones!zone_id(id, name, letter)').eq('id', suggested_table_id).single(),
    sb.from('tables').select('id, zone:table_zones!zone_id(id, name, letter)').eq('id', actual_table_id).single(),
  ])
  // If letter column doesn't exist, re-query without it and use name-based fallback
  const fetchZoneLetter = async (res: typeof suggestedTable, tableId: string): Promise<string | null> => {
    if (res.error) {
      const res2 = await sb.from('tables').select('id, zone:table_zones!zone_id(id, name)').eq('id', tableId).single()
      const zone = (res2.data as unknown as { id: string; zone: { id: string; name: string } | null } | null)?.zone
      return zone ? getZoneLetter(zone.name) : null
    }
    const zone = (res.data as unknown as { id: string; zone: { id: string; name: string; letter: string | null } | null } | null)?.zone
    return zone?.letter ?? (zone ? getZoneLetter(zone.name) : null)
  }
  const suggestedZone = await fetchZoneLetter(suggestedTable, suggested_table_id)
  const actualZone = await fetchZoneLetter(actualTable, actual_table_id)

  // Log the correction — matches María's migration schema
  const { error: insertErr } = await sb.from('assignment_corrections').insert({
    restaurant_id: RESTAURANT_ID,
    reservation_id,
    original_table_id: suggested_table_id,
    corrected_table_id: actual_table_id,
    reason: `Host override: suggested ${suggestedZone ?? '?'} → actual ${actualZone ?? '?'}`,
  })

  if (insertErr) {
    // If table doesn't exist yet (pre-FASE-6), silently succeed
    console.warn('Could not log correction (table may not exist):', insertErr.message)
  }

  return NextResponse.json({ ok: true, correction: true })
}
export async function POST(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { reservation_id } = body
  if (!reservation_id) {
    return NextResponse.json({ error: 'Falta reservation_id' }, { status: 400 })
  }

  const sb = getServiceClient()

  // ── 1. Fetch reservation ──
  const { data: reservation, error: resErr } = await sb
    .from('reservations')
    .select('id, party_size, date, time_start, time_end, table_id, status')
    .eq('id', reservation_id)
    .single()

  if (resErr || !reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  // Only suggest for reservations that need a table
  if (reservation.table_id) {
    return NextResponse.json({
      error: 'Esta reserva ya tiene mesa asignada',
      current_table_id: reservation.table_id,
    }, { status: 400 })
  }

  // ── 2. Fetch all active tables with zone info (try with letter, fallback without) ──
  let tablesRes = await sb
    .from('tables')
    .select('id, number, capacity, capacity_min, can_combine, combine_group, floor_num, zone:table_zones!zone_id(id, name, letter)')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('is_active', true)
    .order('capacity', { ascending: true })

  if (tablesRes.error) {
    tablesRes = await sb
      .from('tables')
      .select('id, number, capacity, capacity_min, can_combine, combine_group, floor_num, zone:table_zones!zone_id(id, name)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .order('capacity', { ascending: true })
  }

  if (tablesRes.error || !tablesRes.data) {
    return NextResponse.json({ error: 'Error cargando mesas' }, { status: 500 })
  }

  // Flatten zone info — Supabase returns join as nested object
  type TableRow = { id: string; number: string; capacity: number; capacity_min: number | null; can_combine: boolean | null; combine_group: string | null; floor_num: number | null; zone: { id: string; name: string; letter?: string | null } | null }
  const availableTables = (tablesRes.data as unknown as TableRow[]).map(t => {
    const zone = t.zone
    return {
      id: t.id as string,
      number: t.number as string,
      zone_letter: (zone?.letter ?? getZoneLetter(zone?.name)) as string,
      zone_name: (zone?.name ?? 'Sin zona') as string,
      capacity: t.capacity as number,
      capacity_min: (t.capacity_min ?? t.capacity) as number,
      can_combine: (t.can_combine ?? false) as boolean,
      combine_group: (t.combine_group ?? null) as string | null,
      floor_num: (t.floor_num ?? 1) as number,
    }
  })

  // ── 3. Fetch existing reservations for the same date ──
  const { data: existingReservations, error: resDayErr } = await sb
    .from('reservations')
    .select('table_id, time_start, time_end')
    .eq('date', reservation.date)
    .neq('id', reservation_id)
    .not('table_id', 'is', null)
    .in('status', ['confirmed', 'pre_paid', 'seated'])

  if (resDayErr || !existingReservations) {
    return NextResponse.json({ error: 'Error cargando reservas existentes' }, { status: 500 })
  }

  // ── 4. Fetch table combinations ──
  const { data: combinations, error: combosErr } = await sb
    .from('table_combinations')
    .select('id, table_ids, combined_capacity, is_active, name')
    .eq('is_active', true)

  const combos = combosErr ? [] : (combinations ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    table_ids: c.table_ids as string[],
    combined_capacity: c.combined_capacity as number,
    is_active: (c.is_active ?? true) as boolean,
    name: (c.name ?? null) as string | null,
  }))

  // ── 5. Run algorithm ──
  const input: AssignmentInput = {
    reservation: {
      id: reservation.id,
      party_size: reservation.party_size,
      date: reservation.date,
      time_start: reservation.time_start,
      time_end: reservation.time_end,
    },
    available_tables: availableTables,
    existing_reservations: existingReservations.map((r: Record<string, unknown>) => ({
      table_id: r.table_id as string,
      time_start: r.time_start as string,
      time_end: r.time_end as string,
    })),
    combinations: combos,
  }

  const result = assignTable(input)

  return NextResponse.json(result)
}