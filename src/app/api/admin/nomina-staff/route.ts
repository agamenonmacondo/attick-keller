import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth'

// GET /api/admin/nomina-staff?area=cocina (opcional)
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { searchParams } = new URL(request.url)
  const area = searchParams.get('area')

  let query = sb
    .from('pos_nomina_staff')
    .select('id, nombre_completo, cargo, area, secondary_areas, salario, sede, cedula, correo, contrato, activo')
    .eq('sede', 'C75')
    .order('nombre_completo')

  if (area) {
    query = query.eq('area', area)
  }

  const { data: staff, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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
    id: s.id,
    nombre_completo: s.nombre_completo,
    cargo: s.cargo,
    area: s.area,
    secondary_areas: s.secondary_areas || [],
    salario_mensual: s.salario || 0,
    sede: s.sede,
    cedula: s.cedula || null,
    correo: s.correo || null,
    contrato: s.contrato || 'fijo',
    activo: s.activo !== false,
    alias: aliasMap.get(s.id as string) || (s.nombre_completo as string).split(' ')[0],
  }))

  return NextResponse.json(enrichedStaff)
}

// POST /api/admin/nomina-staff — crear nuevo empleado
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { nombre_completo, cargo, area, contrato, cedula, correo, salario_mensual, alias } = body

  if (!nombre_completo || !area) {
    return NextResponse.json({ error: 'nombre_completo y area son requeridos' }, { status: 400 })
  }

  const { data: staff, error } = await sb
    .from('pos_nomina_staff')
    .insert({
      nombre_completo,
      cargo: cargo || '',
      area,
      secondary_areas: [],
      salario: salario_mensual || 0,
      sede: 'C75',
      cedula: cedula || null,
      correo: correo || null,
      contrato: contrato || 'fijo',
      activo: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (alias) {
    await sb.from('staff_aliases').insert({
      employee_id: (staff as Record<string, unknown>).id,
      alias,
      source: 'interno',
    })
  }

  return NextResponse.json(staff, { status: 201 })
}

// PATCH /api/admin/nomina-staff — actualizar empleado
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { id, nombre_completo, cargo, area, contrato, cedula, correo, salario_mensual, activo } = body

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (nombre_completo !== undefined) updates.nombre_completo = nombre_completo
  if (cargo !== undefined) updates.cargo = cargo
  if (area !== undefined) updates.area = area
  if (contrato !== undefined) updates.contrato = contrato
  if (cedula !== undefined) updates.cedula = cedula
  if (correo !== undefined) updates.correo = correo
  if (salario_mensual !== undefined) updates.salario = salario_mensual
  if (activo !== undefined) updates.activo = activo

  const { data, error } = await sb
    .from('pos_nomina_staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
