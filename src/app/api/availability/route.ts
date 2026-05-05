import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient, getStaffUser, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { checkAvailability } from '@/lib/algorithms/table-assignment'
import type { TableWithZone } from '@/lib/algorithms/table-assignment'
import { getZoneLetter } from '@/lib/utils/zone-letter'

// ─── Auth helpers ──────────────────────────────────────────────────

async function getAuthUser(request: NextRequest) {
  const cookieStore = request.cookies
  const serverSb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await serverSb.auth.getUser()
  return user
}

// ─── Zone letter mapping ───────────────────────────────────────────
// Uses getZoneLetter() from zone-letter.ts as primary source.
// The ZONE_LETTERS array below is kept as a fallback for zones 
// that might not be in the mapping (shouldn't happen in practice).

const ZONE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const

// ─── Fallback service hours ────────────────────────────────────────

const FALLBACK_SERVICE_HOURS = [
  { day_of_week: 0, open: '18:00', close: '22:00' },
  { day_of_week: 1, open: '18:00', close: '22:00' },
  { day_of_week: 2, open: '18:00', close: '22:00' },
  { day_of_week: 3, open: '18:00', close: '22:00' },
  { day_of_week: 4, open: '18:00', close: '22:00' },
  { day_of_week: 5, open: '18:00', close: '22:00' },
  { day_of_week: 6, open: '18:00', close: '22:00' },
]

// ─── GET /api/availability ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sb = getServiceClient()

  // ── Auth: authenticated user or staff (admin/host) ──
  const [user, staff] = await Promise.all([
    getAuthUser(request),
    getStaffUser(request),
  ])
  if (!user && !staff) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // ── Validate query params ──
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const partySizeStr = url.searchParams.get('party_size')

  if (!date || !partySizeStr) {
    return NextResponse.json(
      { error: 'Se requieren los parámetros date (YYYY-MM-DD) y party_size' },
      { status: 400 },
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
      { status: 400 },
    )
  }

  const partySize = parseInt(partySizeStr, 10)
  if (isNaN(partySize) || partySize < 1 || partySize > 20) {
    return NextResponse.json(
      { error: 'party_size debe ser un número entre 1 y 20' },
      { status: 400 },
    )
  }

  // ── Fetch all required data in parallel ──
  const [tablesRes, zonesRes, combosRes, reservationsRes, availRes] = await Promise.all([
    sb.from('tables')
      .select('id, number, capacity, capacity_min, can_combine, combine_group, zone_id')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true),
    sb.from('table_zones')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('sort_order', { ascending: true }),
    sb.from('table_combinations')
      .select('id, table_ids, combined_capacity, is_active, name')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true),
    sb.from('reservations')
      .select('id, table_id, table_combination_id, time_start, time_end')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('date', date)
      .in('status', ['confirmed', 'pre_paid', 'seated']),
    sb.from('availability')
      .select('day_of_week, open, close')
      .eq('restaurant_id', RESTAURANT_ID),
  ])

  if (tablesRes.error) {
    console.error('Error fetching tables:', tablesRes.error)
    return NextResponse.json({ error: 'Error al cargar datos de mesas' }, { status: 500 })
  }

  // ── Build zone_id → letter/name mapping ──
  const zones = zonesRes.data ?? []
  const zoneLetterMap = new Map<string, string>()
  const zoneNameMap = new Map<string, string>()

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i] as Record<string, unknown>
    // Try DB letter column first, then name-based fallback
    const letter = typeof zone.letter === 'string' && zone.letter
      ? zone.letter
      : typeof zone.zone_letter === 'string' && zone.zone_letter
        ? zone.zone_letter
        : getZoneLetter(zone.name as string) || ZONE_LETTERS[i] || ''
    zoneLetterMap.set(zone.id as string, letter)
    zoneNameMap.set(zone.id as string, zone.name as string)
  }

  // ── Map tables → TableWithZone ──
  const tables = tablesRes.data ?? []
  const availableTables: TableWithZone[] = tables.map(t => ({
    id: t.id,
    number: t.number,
    zone_letter: zoneLetterMap.get(t.zone_id ?? '') ?? 'E',
    zone_name: zoneNameMap.get(t.zone_id ?? '') ?? 'Ático',
    capacity: t.capacity,
    capacity_min: t.capacity_min ?? 1,
    can_combine: t.can_combine ?? false,
    combine_group: t.combine_group,
    floor_num: 0,
  }))

  // ── Build existing_reservations, expanding combinations ──
  const combos = combosRes.data ?? []
  const comboTableMap = new Map<string, string[]>(combos.map(c => [c.id as string, (c.table_ids ?? []) as string[]]))

  const existingReservations: { table_id: string; time_start: string; time_end: string }[] = []
  for (const r of reservationsRes.data ?? []) {
    if (r.table_id) {
      existingReservations.push({
        table_id: r.table_id,
        time_start: r.time_start,
        time_end: r.time_end,
      })
    }
    if (r.table_combination_id) {
      const comboTableIds = comboTableMap.get(r.table_combination_id)
      if (comboTableIds) {
        for (const tid of comboTableIds) {
          existingReservations.push({
            table_id: tid,
            time_start: r.time_start,
            time_end: r.time_end,
          })
        }
      }
    }
  }

  // ── Build combinations input ──
  const combinations = combos.map(c => ({
    id: c.id,
    table_ids: c.table_ids as string[],
    combined_capacity: c.combined_capacity,
    is_active: c.is_active,
    name: c.name,
  }))

  // ── Build service hours (DB first, fallback to hardcoded dinner hrs) ──
  const availData = availRes.data ?? []
  const serviceHours =
    availData.length > 0
      ? (availData as Array<{ day_of_week: number; open: string; close: string }>)
      : FALLBACK_SERVICE_HOURS

  // ── Run algorithm ──
  try {
    const slots = checkAvailability({
      date,
      party_size: partySize,
      available_tables: availableTables,
      existing_reservations: existingReservations,
      combinations,
      service_hours: serviceHours,
    })

    return NextResponse.json(
      { date, party_size: partySize, slots },
      {
        headers: {
          // Cache for 30 s; stale-while-revalidate for another 30 s
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
        },
      },
    )
  } catch (error) {
    console.error('Availability algorithm error:', error)
    return NextResponse.json({ error: 'Error al calcular disponibilidad' }, { status: 500 })
  }
}
