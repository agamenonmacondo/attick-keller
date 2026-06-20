import { NextRequest, NextResponse } from 'next/server'
import { getStaffOrLeaderUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// Force dynamic — never cache shift data
export const dynamic = 'force-dynamic'

// GET /api/admin/shift-schedules?area=cocina&week_str=2026-W23
export async function GET(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  let area = searchParams.get('area')
  const week_str = searchParams.get('week_str')

  // lider_area can only see their own area
  if (admin.role === 'lider_area') {
    if (!admin.area) return NextResponse.json({ error: 'No autorizado — sin área asignada' }, { status: 403 })
    area = admin.area
  }

  if (!area || !week_str) {
    return NextResponse.json({ error: 'area y week_str son requeridos' }, { status: 400 })
  }

  const VALID_AREAS = ['cocina', 'barra', 'servicio']
  if (!VALID_AREAS.includes(area)) {
    return NextResponse.json({ error: 'Area invalida' }, { status: 400 })
  }

  // Obtener cronograma
  const { data: schedule, error: schedError } = await sb
    .from('shift_schedules')
    .select('*')
    .eq('area', area)
    .eq('week_str', week_str)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 })
  }

  if (!schedule) {
    // No hay cronograma, devolver datos basicos para crear uno nuevo
    // Incluir personal del area + personal con secondary_areas que incluya el area
    const { data: staff } = await sb
      .from('pos_nomina_staff')
      .select('id, nombre_completo, cargo, area, secondary_areas, salario, auxilio_no_salarial')
      .eq('sede', 'C75')
      .eq('activo', true)
      .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
      .order('nombre_completo')

    const { data: shiftTypes } = await sb
      .from('shift_types')
      .select('*')
      .eq('area', area)
      .order('code')

    // Obtener aliases
    const staffIds = (staff || []).map((s: Record<string, unknown>) => s.id as string)
    const { data: aliases } = await sb
      .from('staff_aliases')
      .select('employee_id, alias')
      .in('employee_id', staffIds)

    const aliasMap = new Map(
      (aliases || []).map((a: Record<string, unknown>) => [a.employee_id as string, a.alias as string])
    )

    // Cargar segmentos para turnos partidos
    let segmentsByType: Record<string, Array<{ id: string; segment_index: number; entrada: string; salida: string }>> = {}
    const splitTypeIds = (shiftTypes || []).filter((st: Record<string, unknown>) => st.is_split).map((st: Record<string, unknown>) => st.id as string)
    if (splitTypeIds.length > 0) {
      const { data: segments } = await sb
        .from('shift_type_segments')
        .select('id, shift_type_id, segment_index, entrada, salida')
        .in('shift_type_id', splitTypeIds)
        .order('segment_index')
      for (const seg of (segments || [])) {
        const typeId = seg.shift_type_id as string
        if (!segmentsByType[typeId]) segmentsByType[typeId] = []
        segmentsByType[typeId].push({ id: seg.id, segment_index: seg.segment_index, entrada: seg.entrada, salida: seg.salida })
      }
    }

    const enrichedStaff = (staff || []).map((s: Record<string, unknown>) => ({
      ...s,
      salario_mensual: s.salario ?? 0,
      auxilio_no_salarial: s.auxilio_no_salarial ?? 0,
      nombre: (s.nombre_completo as string || '').split(' ')[0],
      alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
    }))

    const enrichedShiftTypes = (shiftTypes || []).map((st: Record<string, unknown>) => ({
      ...st,
      segments: st.is_split ? (segmentsByType[st.id as string] || []) : undefined,
    }))

    return NextResponse.json({ schedule: null, assignments: [], staff: enrichedStaff, shift_types: enrichedShiftTypes })
  }

  // Obtener asignaciones
  const { data: assignments, error: assignError } = await sb
    .from('shift_assignments')
    .select('*')
    .eq('schedule_id', schedule.id)

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  // Incluir personal del area + personal con secondary_areas que incluya el area
  const { data: staff } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, secondary_areas, salario, auxilio_no_salarial')
    .eq('sede', 'C75')
    .eq('activo', true)
    .or(`area.eq.${area},secondary_areas.cs.{${area}}`)
    .order('nombre_completo')

  const { data: shiftTypes } = await sb
    .from('shift_types')
    .select('*')
    .eq('area', area)
    .order('code')

  // Obtener aliases
  const staffIds = (staff || []).map((s: Record<string, unknown>) => s.id as string)
  const { data: aliases } = await sb
    .from('staff_aliases')
    .select('employee_id, alias')
    .in('employee_id', staffIds)

  const aliasMap = new Map(
    (aliases || []).map((a: Record<string, unknown>) => [a.employee_id as string, a.alias as string])
  )

  // Cargar segmentos para turnos partidos
  let segmentsByType: Record<string, Array<{ id: string; segment_index: number; entrada: string; salida: string }>> = {}
  const splitTypeIds = (shiftTypes || []).filter((st: Record<string, unknown>) => st.is_split).map((st: Record<string, unknown>) => st.id as string)
  if (splitTypeIds.length > 0) {
    const { data: segments } = await sb
      .from('shift_type_segments')
      .select('id, shift_type_id, segment_index, entrada, salida')
      .in('shift_type_id', splitTypeIds)
      .order('segment_index')
    for (const seg of (segments || [])) {
      const typeId = seg.shift_type_id as string
      if (!segmentsByType[typeId]) segmentsByType[typeId] = []
      segmentsByType[typeId].push({ id: seg.id, segment_index: seg.segment_index, entrada: seg.entrada, salida: seg.salida })
    }
  }

  const enrichedStaff = (staff || []).map((s: Record<string, unknown>) => ({
    ...s,
    salario_mensual: s.salario ?? 0,
    auxilio_no_salarial: s.auxilio_no_salarial ?? 0,
    nombre: (s.nombre_completo as string || '').split(' ')[0],
    alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
  }))

  const enrichedShiftTypes = (shiftTypes || []).map((st: Record<string, unknown>) => ({
    ...st,
    segments: st.is_split ? (segmentsByType[st.id as string] || []) : undefined,
  }))

  return NextResponse.json({
    schedule,
    assignments: assignments || [],
    staff: enrichedStaff,
    shift_types: enrichedShiftTypes,
  })
}

// POST /api/admin/shift-schedules — crear nuevo cronograma
export async function POST(request: NextRequest) {
  const admin = await getStaffOrLeaderUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { area, week_str } = body

  if (!area || !week_str) {
    return NextResponse.json({ error: 'area y week_str son requeridos' }, { status: 400 })
  }

  const VALID_AREAS = ['cocina', 'barra', 'servicio']
  if (!VALID_AREAS.includes(area)) {
    return NextResponse.json({ error: 'Area invalida' }, { status: 400 })
  }

  // Verificar permiso de lider_area: solo puede crear en su area
  if (admin.role === 'lider_area') {
    if (!admin.area || admin.area !== area) {
      return NextResponse.json({ error: 'No autorizado — solo puede gestionar su área asignada' }, { status: 403 })
    }
  }

  // Crear nuevo cronograma
  const { data: schedule, error } = await sb
    .from('shift_schedules')
    .insert({
      restaurant_id: RESTAURANT_ID,
      area,
      week_str,
      created_by: admin.id,
      status: 'draft',
      version: 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }

  return NextResponse.json(schedule, { status: 201 })
}