import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { getColombiaTime } from '@/lib/utils/date'
import { computeUrgency } from '@/lib/utils/urgency'

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date(Date.now() - 5*60*60*1000 + new Date().getTimezoneOffset()*60*1000).toISOString().split('T')[0]

  // Current time in Colombia for urgency computation
  const currentTime = getColombiaTime()

  const [tablesRes, zonesRes, activeResRes, combosRes] = await Promise.all([
    sb.from('tables').select('id, number, name_attick, capacity, zone_id, can_combine, combine_group, is_active, sort_order, table_zones(id, name)').eq('restaurant_id', RESTAURANT_ID).eq('is_active', true).order('sort_order', { ascending: true }),
    sb.from('table_zones').select('id, name, description, sort_order').eq('restaurant_id', RESTAURANT_ID).order('sort_order', { ascending: true }),
    sb.from('reservations').select('id, table_id, table_combination_id, party_size, status, time_start, time_end, special_requests, customers(id, full_name, phone, email)').eq('restaurant_id', RESTAURANT_ID).eq('date', date).in('status', ['confirmed', 'pre_paid', 'seated']),
    sb.from('table_combinations').select('id, table_ids, combined_capacity, is_active').eq('restaurant_id', RESTAURANT_ID).eq('is_active', true),
  ])

  const tables = tablesRes.data || []
  const zones = zonesRes.data || []
  const activeReservations = activeResRes.data || []
  const combinations = combosRes.data || []

  // ─── Build multi-reservation map: table_id → Reservation[] ─────
  const tableReservationsMap = new Map<string, typeof activeReservations[number][]>()
  for (const r of activeReservations) {
    if (r.table_id) {
      const arr = tableReservationsMap.get(r.table_id) || []
      arr.push(r)
      tableReservationsMap.set(r.table_id, arr)
    }
  }
  // Sort each table's reservations by time_start
  for (const [_, arr] of tableReservationsMap) {
    arr.sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''))
  }

  // Combination reservations (single reservation per combo)
  const comboReservationMap = new Map<string, typeof activeReservations[0]>()
  for (const r of activeReservations) {
    if (r.table_combination_id) comboReservationMap.set(r.table_combination_id, r)
  }

  // ─── Helper: classify a reservation's time status ─────────────
  function classifyTime(timeStart: string, timeEnd: string) {
    const nowMins = timeToMinutes(currentTime)
    const startMins = timeToMinutes(timeStart)
    const endMins = timeToMinutes(timeEnd)
    return {
      is_current: nowMins >= startMins && nowMins < endMins,
      is_past: nowMins >= endMins,
      is_upcoming: nowMins < startMins,
    }
  }

  function timeToMinutes(time: string): number {
    const parts = time.split(':').map(Number)
    return parts[0] * 60 + (parts[1] || 0)
  }

  // ─── Build reservation timeline for a table ──────────────────
  function buildTimeline(tableId: string) {
    const resList = tableReservationsMap.get(tableId) || []
    return resList.map(r => {
      const custRaw = r.customers as unknown as Array<{ id: string; full_name: string; phone: string; email: string }> | { id: string; full_name: string; phone: string; email: string } | null | undefined
      const cust = Array.isArray(custRaw) ? custRaw[0] : custRaw
      const { is_current, is_past, is_upcoming } = classifyTime(r.time_start, r.time_end)

      return {
        id: r.id,
        status: r.status,
        party_size: r.party_size,
        customer_name: cust?.full_name || null,
        customer_phone: cust?.phone || null,
        customer_email: cust?.email || null,
        special_requests: (r as any).special_requests || null,
        time_start: r.time_start,
        time_end: r.time_end,
        is_current,
        is_past,
        is_upcoming,
      }
    })
  }

  // ─── Build table data with timeline + urgency ──────────────────
  function buildTableData(t: any) {
    const reservations = buildTimeline(t.id)

    // Find current reservation (active now)
    const currentReservation = reservations.find(r => r.is_current) || null

    // Find next upcoming reservation
    const upcomingReservations = reservations.filter(r => r.is_upcoming)
    const nextReservation = upcomingReservations.length > 0 ? upcomingReservations[0] : null

    // Compute urgency based on next upcoming reservation
    const urgencyLevel = computeUrgency(currentTime, nextReservation?.time_start || null)

    // Get zone name from nested join
    const tzRaw = t.table_zones as unknown as Array<{ id: string; name: string }> | { id: string; name: string } | null | undefined
    const tz = Array.isArray(tzRaw) ? tzRaw[0] : tzRaw
    const zoneName = tz?.name || null

    // Backward compat: derive legacy fields from current reservation
    // Also consider ANY reservation (including upcoming) for is_occupied
    const anyActiveReservation = reservations.find(r => r.is_current) || reservations.find(r => r.is_upcoming) || null

    return {
      id: t.id,
      number: t.number,
      name_attick: t.name_attick,
      capacity: t.capacity,
      zone_id: t.zone_id,
      zone_name: zoneName,
      can_combine: t.can_combine,
      combine_group: t.combine_group,

      // New timeline data
      reservations,
      current_reservation: currentReservation,
      next_reservation: nextReservation,
      urgency_level: urgencyLevel,

      // Backward compat (derived from current/any reservation)
      is_occupied: reservations.length > 0 && !!currentReservation,
      current_reservation_id: currentReservation?.id || anyActiveReservation?.id || null,
      current_party_size: currentReservation?.party_size || anyActiveReservation?.party_size || null,
      current_customer_name: currentReservation?.customer_name || anyActiveReservation?.customer_name || null,
      current_time: currentReservation
        ? `${currentReservation.time_start} - ${currentReservation.time_end}`
        : anyActiveReservation
          ? `${anyActiveReservation.time_start} - ${anyActiveReservation.time_end}`
          : null,
      // Reservation status for color coding
      reservation_status: currentReservation?.status || anyActiveReservation?.status || null,
    }
  }

  const zonesWithTables = zones.map(zone => ({
    ...zone,
    tables: tables.filter(t => t.zone_id === zone.id).map(buildTableData),
  }))

  const unassignedTables = tables
    .filter(t => !t.zone_id)
    .map(buildTableData)

  const combinationsWithStatus = combinations.map(c => ({
    ...c,
    is_occupied: comboReservationMap.has(c.id),
    current_reservation_id: comboReservationMap.get(c.id)?.id || null,
  }))

  return NextResponse.json({
    zones: zonesWithTables,
    unassignedTables,
    combinations: combinationsWithStatus,
    // Include current time for frontend to know the reference point
    current_time: currentTime,
  })
}