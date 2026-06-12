import { NextRequest, NextResponse } from 'next/server'
import { getStaffUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { getZoneLetter } from '@/lib/utils/zone-letter'
import { getBlockedTableIds } from '@/lib/utils/table-blocks'
import { assignTable } from '@/lib/algorithms/table-assignment'
import type { TableWithZone, EventZoneSuggestion, EventMultiZoneSuggestion, Alternative } from '@/lib/algorithms/table-assignment'

/**
 * GET /api/admin/reservations/[id]/table-options
 *
 * Returns available table options for a reservation that needs assignment.
 * Uses the canonical assignTable() algorithm — same scoring, zone priorities,
 * time routing, event logic, and multi-zone evaluation used by the reservation API.
 *
 * Four tiers:
 *   1. Zonas completas — zones where available capacity covers the party
 *   2. Combinaciones — table_combinations that fit (scored)
 *   3. Mesas individuales — single tables that fit (scored)
 *   4. Multi-zona — combined zones for events too large for one zone
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

  // Fetch all active tables with zone info
  const [tablesRes, reservationsRes, combosRes] = await Promise.all([
    sb.from('tables')
      .select('id, number, name_attick, capacity, capacity_min, zone_id, can_combine, combine_group, table_zones(id, name, letter)')
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

  // Build TableWithZone[] for the algorithm
  const availableTables: TableWithZone[] = tables.map((t: any) => {
    const tz = getZone(t)
    return {
      id: t.id,
      number: t.number,
      zone_letter: tz?.letter ?? getZoneLetter(tz?.name),
      zone_name: tz?.name ?? 'Sin zona',
      capacity: t.capacity,
      capacity_min: t.capacity_min ?? t.capacity,
      can_combine: t.can_combine ?? false,
      combine_group: t.combine_group ?? null,
      floor_num: 1,
    }
  })

  // Build combinations for the algorithm
  const algoCombinations = combinations.map((c: any) => ({
    id: c.id,
    table_ids: c.table_ids,
    combined_capacity: c.combined_capacity,
    is_active: c.is_active,
    name: c.name,
  }))

  // Build existing reservations for the algorithm (exclude this reservation's own table)
  const algoExisting = existingReservations
    .filter((r: any) => r.table_id !== reservation.table_id)
    .map((r: any) => ({
      table_id: r.table_id,
      time_start: r.time_start,
      time_end: r.time_end,
    }))

  // ─── Call the canonical algorithm ──────────────────────────────
  const result = assignTable({
    reservation: {
      id: reservation.id,
      party_size,
      date,
      time_start,
      time_end,
    },
    available_tables: availableTables,
    existing_reservations: algoExisting,
    combinations: algoCombinations,
    blocked_table_ids: blockedTableIds,
  })

  // ─── Map algorithm output to frontend format ───────────────────

  // Tier 1: Full Zones (from event_zone_suggestions)
  const fullZones = (result.event_zone_suggestions || [])
    .filter(z => z.fits_zone && z.available_capacity >= party_size)
    .map(z => ({
      type: 'full_zone' as const,
      zone_id: '', // zone_id not available in algorithm, frontend uses zone_name
      zone_name: z.zone_name,
      zone_letter: z.zone_letter,
      total_capacity: z.available_capacity,
      table_count: z.available_tables,
      table_ids: z.available_table_ids,
      tables: z.available_table_details.map(t => ({
        id: t.id,
        number: t.number,
        name_attick: null as string | null,
        capacity: t.capacity,
      })),
      label: `Zona ${z.zone_name} completa (${z.available_capacity}p en ${z.available_tables} mesas)`,
      // Extra event info
      displaced_count: z.displaced_count,
      rehousing_possible: z.rehousing_possible,
    }))

  // Tier 2: Combinations (from alternatives)
  const combinationOptions = result.alternatives
    .filter(a => a.combination_id)
    .map(a => ({
      type: 'combination' as const,
      combination_id: a.combination_id,
      combination_name: null as string | null,
      combined_capacity: 0, // derived from tables
      table_count: a.table_numbers.length,
      table_ids: [] as string[], // not available in Alternative
      tables: a.table_numbers.map(n => ({
        id: '',
        number: n,
        name_attick: null as string | null,
        capacity: 0,
      })),
      zone_name: a.zone_name,
      label: `Combinación ${a.table_numbers.join('+')} (${a.zone_name}) · Score:${a.score.toFixed(1)}`,
      score: a.score,
    }))

  // Tier 3: Single Tables (from alternatives, non-combination)
  const singleTables = result.alternatives
    .filter(a => !a.combination_id)
    .map(a => ({
      type: 'single_table' as const,
      table_id: a.table_id,
      table_number: a.table_numbers[0] || '?',
      table_name: null as string | null,
      capacity: 0, // not in Alternative
      zone_name: a.zone_name,
      label: `Mesa ${a.table_numbers[0]} · ${a.zone_name} · Score:${a.score.toFixed(1)}`,
      score: a.score,
    }))

  // Tier 4: Multi-Zone (from event_multi_zone)
  const multiZone = (() => {
    const mz = result.event_multi_zone
    if (!mz || mz.zones.length <= 1) return null

    return {
      type: 'multi_zone' as const,
      zones: mz.zones.map(z => ({
        zone_id: '',
        zone_name: z.zone_name,
        zone_letter: z.zone_letter,
        capacity_used: z.available_capacity,
        total_capacity: z.total_capacity,
        table_ids: z.available_table_ids,
        tables: z.available_table_details.map(t => ({
          id: t.id,
          number: t.number,
          name_attick: null as string | null,
          capacity: t.capacity,
        })),
      })),
      total_capacity: mz.combined_available,
      zone_count: mz.zones.length,
      table_count: mz.zones.reduce((s, z) => s + z.available_tables, 0),
      table_ids: mz.zones.flatMap(z => z.available_table_ids),
      label: mz.zones.map(z => `${z.zone_name} (${z.available_capacity}p)`).join(' + '),
      covers: mz.fits,
      deficit: mz.fits ? 0 : Math.max(0, party_size - mz.combined_available),
    }
  })()

  // Compute summary
  const totalFreeCapacity = availableTables.reduce((s: number, t: TableWithZone) => {
    // Check if table is free in the time window
    const isFree = !algoExisting.some(r =>
      r.table_id === t.id &&
      r.time_start < time_end &&
      r.time_end > time_start
    ) && !blockedTableIds.includes(t.id)
    return s + (isFree ? t.capacity : 0)
  }, 0)

  const totalFreeTables = availableTables.filter(t => {
    return !algoExisting.some(r =>
      r.table_id === t.id &&
      r.time_start < time_end &&
      r.time_end > time_start
    ) && !blockedTableIds.includes(t.id)
  }).length

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
      combinations: combinationOptions,
      single_tables: singleTables,
      multi_zone: multiZone,
    },
    summary: {
      total_free_capacity: totalFreeCapacity,
      total_free_tables: totalFreeTables,
      has_full_zone: fullZones.length > 0,
      has_combination: combinationOptions.length > 0,
      has_single_table: singleTables.length > 0,
      has_multi_zone: !!multiZone,
    },
    // Raw algorithm result for debugging / future use
    _algorithm: {
      is_event: result.is_event,
      reason: result.reason,
      score: result.score,
    },
  })
}
