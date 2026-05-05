import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date(Date.now() - 5*60*60*1000 + new Date().getTimezoneOffset()*60*1000).toISOString().split('T')[0]

  const [tablesRes, reservationsRes] = await Promise.all([
    sb
      .from('tables')
      .select('id, number, name_attick, capacity, position_x, position_y, zone_id, is_active, can_combine, table_zones(id, name, floor_num)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true),
    sb
      .from('reservations')
      .select('id, table_id, party_size, status, time_start, time_end, special_requests, customers(full_name, phone, email)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('date', date)
      .in('status', ['confirmed', 'pre_paid', 'seated']),
  ])

  const tables = tablesRes.data || []
  const activeReservations = reservationsRes.data || []

  // Build a map of table_id → reservation for quick lookup
  const tableReservationMap = new Map<string, (typeof activeReservations)[0]>()
  for (const r of activeReservations) {
    if (r.table_id) tableReservationMap.set(r.table_id, r)
  }

  // Group tables by floor_num via their zone
  type ZoneRow = { id: string; name: string; floor_num: number | null }
  type TableRow = {
    id: string
    number: string
    name_attick: string | null
    capacity: number
    position_x: number | null
    position_y: number | null
    zone_id: string | null
    is_active: boolean
    can_combine: boolean | null
    table_zones: ZoneRow | ZoneRow[] | null
  }

  const FLOOR_NAMES: Record<number, string> = { 1: 'Piso 1', 2: 'Ático' }
  const FLOOR_IMAGES: Record<number, string> = {
    1: '/planos/piso1.svg',
    2: '/planos/atico.svg',
  }

  // Build zone→floor grouping
  const zoneMap = new Map<string, { id: string; name: string; floor_num: number }>()
  const floorSet = new Set<number>()

  for (const t of tables as TableRow[]) {
    const zone = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
    if (zone && zone.id) {
      if (!zoneMap.has(zone.id)) {
        zoneMap.set(zone.id, { id: zone.id, name: zone.name, floor_num: zone.floor_num ?? 1 })
      }
      if (zone.floor_num) floorSet.add(zone.floor_num)
    }
  }

  // Ensure both floors exist even if no tables
  floorSet.add(1)
  floorSet.add(2)

  // Build floors structure
  const floors = Array.from(floorSet)
    .sort((a, b) => a - b)
    .map((floorNum) => {
      // Find zones that belong to this floor
      const zonesOnFloor = Array.from(zoneMap.values()).filter((z) => z.floor_num === floorNum)

      const zones = zonesOnFloor.map((zone) => {
        const zoneTables = (tables as TableRow[])
          .filter((t) => {
            const tz = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
            return tz?.id === zone.id
          })
          .map((t) => {
            const reservation = tableReservationMap.get(t.id) || null
            const custArr = reservation?.customers as unknown as Array<{ full_name: string; phone: string; email: string }> | null | undefined
            const cust = Array.isArray(custArr) ? custArr[0] : null

            let status: 'available' | 'reserved' | 'seated' = 'available'
            if (reservation) {
              status = reservation.status === 'seated' ? 'seated' : 'reserved'
            }

            return {
              id: t.id,
              number: t.number,
              name_attick: t.name_attick,
              capacity: t.capacity,
              position_x: t.position_x,
              position_y: t.position_y,
              zone_id: t.zone_id,
              can_combine: t.can_combine,
              status,
              reservation_id: reservation?.id ?? null,
              party_size: reservation?.party_size ?? null,
              customer_name: cust?.full_name ?? null,
              time_range: reservation ? `${reservation.time_start} - ${reservation.time_end}` : null,
              customer_phone: cust?.phone ?? null,
              customer_email: cust?.email ?? null,
              special_requests: (reservation as any)?.special_requests ?? null,
              reservation_status: reservation?.status ?? null,
            }
          })

        return {
          id: zone.id,
          name: zone.name,
          tables: zoneTables,
        }
      })

      return {
        floor_num: floorNum,
        name: FLOOR_NAMES[floorNum] || `Piso ${floorNum}`,
        image_url: FLOOR_IMAGES[floorNum] || '/planos/piso1.svg',
        zones,
      }
    })

  // Also include tables with no zone or null floor in an "unpositioned" list
  const unpositionedTables = (tables as TableRow[])
    .filter((t) => {
      const tz = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
      return !tz || !tz.floor_num
    })
    .map((t) => {
      const tz = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
      return {
        id: t.id,
        number: t.number,
        name_attick: t.name_attick,
        capacity: t.capacity,
        position_x: t.position_x,
        position_y: t.position_y,
        zone_id: t.zone_id,
        zone_name: tz?.name ?? null,
      }
    })

  // Also add tables that have a zone but no position
  const unpositionedWithZone = (tables as TableRow[])
    .filter((t) => (t.position_x === null || t.position_y === null))
    .filter((t) => {
      // Exclude ones already in unpositionedTables
      const tz = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
      return tz && tz.floor_num // has a zone but no position
    })
    .map((t) => {
      const tz = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones
      return {
        id: t.id,
        number: t.number,
        name_attick: t.name_attick,
        capacity: t.capacity,
        position_x: t.position_x,
        position_y: t.position_y,
        zone_id: t.zone_id,
        zone_name: tz?.name ?? null,
      }
    })

  return NextResponse.json({
    floors,
    unpositionedTables: [...unpositionedTables, ...unpositionedWithZone],
  })
}

export async function PATCH(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { tables: tableUpdates } = body as {
    tables: Array<{ id: string; position_x: number; position_y: number }>
  }

  if (!Array.isArray(tableUpdates) || tableUpdates.length === 0) {
    return NextResponse.json({ error: 'No table updates provided' }, { status: 400 })
  }

  // Update each table's position
  const results = await Promise.all(
    tableUpdates.map((t) =>
      sb
        .from('tables')
        .update({ position_x: t.position_x, position_y: t.position_y })
        .eq('id', t.id)
        .eq('restaurant_id', RESTAURANT_ID)
        .select('id, position_x, position_y')
    )
  )

  const errors = results.filter((r) => r.error)
  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Some updates failed', details: errors.map((e) => e.error) },
      { status: 207 } // Multi-Status
    )
  }

  return NextResponse.json({
    updated: results.map((r) => r.data?.[0]).filter(Boolean),
  })
}