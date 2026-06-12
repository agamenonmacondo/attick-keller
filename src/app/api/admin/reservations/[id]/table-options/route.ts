import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { getZoneLetter } from '@/lib/utils/zone-letter'
import { getBlockedTableIds } from '@/lib/utils/table-blocks'

/**
 * GET /api/admin/reservations/[id]/table-options
 *
 * Returns available table options for a reservation that needs assignment.
 * Three tiers:
 *   1. Zonas completas — if a zone has enough free capacity for the whole party
 *   2. Combinaciones existentes — table_combinations that fit
 *   3. Mesas individuales — single tables that fit
 *
 * Used by the "Asignar Mesa" popup in the Host panel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  // Fetch the reservation
  const { data: reservation } = await sb
    .from('reservations')
    .select('id, date, time_start, time_end, party_size, status, table_id')
    .eq('id', id)
    .single()

  if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

  const { date, time_start, time_end, party_size } = reservation

  // Fetch blocked tables
  const blockedTableIds = await getBlockedTableIds(date, time_start, time_end)
  const blockedSet: Set<string> = new Set(blockedTableIds)

  // Fetch all active tables with zone info
  const [tablesRes, reservationsRes, combosRes] = await Promise.all([
    sb.from('tables')
      .select('id, number, name_attick, capacity, zone_id, can_combine, combine_group, table_zones(id, name, letter)')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .order('capacity', { ascending: false }),
    sb.from('reservations')
      .select('table_id, time_start, time_end')
      .eq('date', date)
      .neq('status', 'cancelled')
      .not('table_id', 'is', null),
    sb.from('table_combinations')
      .select('id, table_ids, combined_capacity, is_active, name')
      .eq('is_active', true)
      .order('combined_capacity', { ascending: false }),
  ])

  const tables = (tablesRes.data || []) as any[]
  const existingReservations = (reservationsRes.data || []) as any[]
  const combinations = (combosRes.data || []) as any[]

  // Helper: extract zone info from nested Supabase response
  function getZone(t: any): { id: string; name: string; letter: string | null } | null {
    const tz = t.table_zones
    if (!tz) return null
    if (Array.isArray(tz)) return tz[0] || null
    return tz
  }

  // Helper: check if a table is free during the reservation window
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const resStart = timeToMinutes(time_start)
  const resEnd = timeToMinutes(time_end)

  function isTableFree(tableId: string): boolean {
    if (blockedSet.has(tableId)) return false
    return !existingReservations.some((r: any) => {
      if (r.table_id !== tableId) return false
      const rStart = timeToMinutes(r.time_start)
      const rEnd = timeToMinutes(r.time_end)
      return rStart < resEnd && rEnd > resStart
    })
  }

  // Build free tables list
  const freeTables = tables.filter((t: any) => isTableFree(t.id))

  // ─── Tier 1: Zonas completas ──────────────────────────────────
  const zoneMap = new Map<string, {
    zone_id: string; zone_name: string; zone_letter: string | null;
    tables: Array<{ id: string; number: string; name_attick: string | null; capacity: number }>;
    total_capacity: number
  }>()

  for (const t of freeTables) {
    const tz = getZone(t)
    const zId = tz?.id || 'unassigned'
    const zName = tz?.name || 'Sin zona'
    const zLetter = tz?.letter || getZoneLetter(zName)

    if (!zoneMap.has(zId)) {
      zoneMap.set(zId, { zone_id: zId, zone_name: zName, zone_letter: zLetter, tables: [], total_capacity: 0 })
    }
    const z = zoneMap.get(zId)!
    z.tables.push({ id: t.id, number: t.number, name_attick: t.name_attick, capacity: t.capacity })
    z.total_capacity += t.capacity
  }

  const fullZones = Array.from(zoneMap.values())
    .filter(z => z.total_capacity >= party_size)
    .sort((a, b) => a.total_capacity - b.total_capacity)
    .map(z => ({
      type: 'full_zone' as const,
      zone_id: z.zone_id,
      zone_name: z.zone_name,
      zone_letter: z.zone_letter,
      total_capacity: z.total_capacity,
      table_count: z.tables.length,
      table_ids: z.tables.map(t => t.id),
      tables: z.tables,
      label: `Zona ${z.zone_name} completa (${z.total_capacity}p en ${z.tables.length} mesas)`,
    }))

  // ─── Tier 2: Combinaciones existentes ─────────────────────────
  const validCombos = combinations
    .filter((c: any) => {
      if (!c.table_ids.every((tid: string) => isTableFree(tid))) return false
      if (c.combined_capacity < party_size) return false
      return true
    })
    .sort((a: any, b: any) => a.combined_capacity - b.combined_capacity)
    .map((c: any) => {
      const comboTables = c.table_ids.map((tid: string) => {
        const t = tables.find((tbl: any) => tbl.id === tid)
        return {
          id: tid,
          number: t?.number || '?',
          name_attick: t?.name_attick || null,
          capacity: t?.capacity || 0,
        }
      })
      const firstTable = tables.find((tbl: any) => tbl.id === c.table_ids[0])
      const zoneName = getZone(firstTable)?.name || 'Mixta'
      return {
        type: 'combination' as const,
        combination_id: c.id,
        combination_name: c.name,
        combined_capacity: c.combined_capacity,
        table_count: c.table_ids.length,
        table_ids: c.table_ids,
        tables: comboTables,
        zone_name: zoneName,
        label: `Combinación ${c.name || 'sin nombre'} (${c.combined_capacity}p en ${c.table_ids.length} mesas) · ${zoneName}`,
      }
    })

  // ─── Tier 3: Mesas individuales ───────────────────────────────
  const singleTables = freeTables
    .filter((t: any) => t.capacity >= party_size)
    .sort((a: any, b: any) => a.capacity - b.capacity)
    .map((t: any) => {
      const tz = getZone(t)
      return {
        type: 'single_table' as const,
        table_id: t.id,
        table_number: t.number,
        table_name: t.name_attick,
        capacity: t.capacity,
        zone_name: tz?.name || 'Sin zona',
        label: `Mesa ${t.number} (${t.capacity}p) · ${tz?.name || 'Sin zona'}`,
      }
    })

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      party_size,
      date,
      time_start,
      time_end,
    },
    options: {
      full_zones: fullZones,
      combinations: validCombos,
      single_tables: singleTables,
    },
    summary: {
      total_free_capacity: freeTables.reduce((s: number, t: any) => s + t.capacity, 0),
      total_free_tables: freeTables.length,
      has_full_zone: fullZones.length > 0,
      has_combination: validCombos.length > 0,
      has_single_table: singleTables.length > 0,
    },
  })
}
