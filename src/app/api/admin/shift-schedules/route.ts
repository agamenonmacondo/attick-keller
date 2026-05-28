import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/shift-schedules?area=cocina&week_str=2026-W23
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const area = searchParams.get('area')
  const week_str = searchParams.get('week_str')

  if (!area || !week_str) {
    return NextResponse.json({ error: 'area y week_str son requeridos' }, { status: 400 })
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
    const { data: staff } = await sb
      .from('pos_nomina_staff')
      .select('id, nombre_completo, cargo, area, secondary_areas, salario')
      .eq('sede', 'C75')
      .not('area', 'in', '(apoyo,admin)')
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

    const enrichedStaff = (staff || []).map((s: Record<string, unknown>) => ({
      ...s,
      salario_mensual: s.salario ?? 0,
      alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
    }))

    return NextResponse.json({ schedule: null, assignments: [], staff: enrichedStaff, shift_types: shiftTypes || [] })
  }

  // Obtener asignaciones
  const { data: assignments, error: assignError } = await sb
    .from('shift_assignments')
    .select('*')
    .eq('schedule_id', schedule.id)

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  // Obtener personal del area (excluye apoyo/admin del cronograma)
  const { data: staff } = await sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, secondary_areas, salario')
    .eq('sede', 'C75')
    .not('area', 'in', '(apoyo,admin)')
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

  const enrichedStaff = (staff || []).map((s: Record<string, unknown>) => ({
    ...s,
    salario_mensual: s.salario ?? 0,
    alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
  }))

  return NextResponse.json({
    schedule,
    assignments: assignments || [],
    staff: enrichedStaff,
    shift_types: shiftTypes || [],
  })
}

// POST /api/admin/shift-schedules — crear nuevo cronograma
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { area, week_str } = body

  if (!area || !week_str) {
    return NextResponse.json({ error: 'area y week_str son requeridos' }, { status: 400 })
  }

  // Verificar permiso de lider_area (solo puede crear en su area)
  if (admin.role === 'lider_area') {
    // TODO: verificar area del lider cuando user_roles tenga columna area
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(schedule, { status: 201 })
}