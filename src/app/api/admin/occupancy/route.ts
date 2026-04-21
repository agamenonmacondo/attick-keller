import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [tablesRes, zonesRes, activeResRes, combosRes] = await Promise.all([
    sb.from('tables').select('id, number, capacity, zone_id, can_combine, combine_group, is_active, sort_order, table_zones(id, name)').eq('restaurant_id', RESTAURANT_ID).eq('is_active', true).order('sort_order', { ascending: true }),
    sb.from('table_zones').select('id, name, description, sort_order').eq('restaurant_id', RESTAURANT_ID).order('sort_order', { ascending: true }),
    sb.from('reservations').select('id, table_id, table_combination_id, party_size, status, time_start, time_end, customers(full_name)').eq('restaurant_id', RESTAURANT_ID).eq('date', date).in('status', ['confirmed', 'pre_paid', 'seated']),
    sb.from('table_combinations').select('id, table_ids, combined_capacity, is_active').eq('restaurant_id', RESTAURANT_ID).eq('is_active', true),
  ])

  const tables = tablesRes.data || []
  const zones = zonesRes.data || []
  const activeReservations = activeResRes.data || []
  const combinations = combosRes.data || []

  const tableReservationMap = new Map<string, typeof activeReservations[0]>()
  for (const r of activeReservations) {
    if (r.table_id) tableReservationMap.set(r.table_id, r)
  }

  const comboReservationMap = new Map<string, typeof activeReservations[0]>()
  for (const r of activeReservations) {
    if (r.table_combination_id) comboReservationMap.set(r.table_combination_id, r)
  }

  const zonesWithTables = zones.map(zone => ({
    ...zone,
    tables: tables
      .filter(t => t.zone_id === zone.id)
      .map(t => {
        const reservation = tableReservationMap.get(t.id) || null
        const custArr = reservation?.customers as unknown as Array<{ full_name: string }> | null | undefined
        const cust = Array.isArray(custArr) ? custArr[0] : null
        return {
          id: t.id,
          number: t.number,
          capacity: t.capacity,
          is_occupied: !!reservation,
          current_reservation_id: reservation?.id || null,
          current_party_size: reservation?.party_size || null,
          current_customer_name: cust?.full_name || null,
          current_time: reservation ? `${reservation.time_start} - ${reservation.time_end}` : null,
          can_combine: t.can_combine,
          combine_group: t.combine_group,
        }
      }),
  }))

  const unassignedTables = tables
    .filter(t => !t.zone_id)
    .map(t => {
      const reservation = tableReservationMap.get(t.id) || null
      const custArr = reservation?.customers as unknown as Array<{ full_name: string }> | null | undefined
      const cust = Array.isArray(custArr) ? custArr[0] : null
      return {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        is_occupied: !!reservation,
        current_reservation_id: reservation?.id || null,
        current_party_size: reservation?.party_size || null,
        current_customer_name: cust?.full_name || null,
        current_time: reservation ? `${reservation.time_start} - ${reservation.time_end}` : null,
        can_combine: t.can_combine,
        combine_group: t.combine_group,
      }
    })

  const combinationsWithStatus = combinations.map(c => ({
    ...c,
    is_occupied: comboReservationMap.has(c.id),
    current_reservation_id: comboReservationMap.get(c.id)?.id || null,
  }))

  return NextResponse.json({ zones: zonesWithTables, unassignedTables, combinations: combinationsWithStatus })
}