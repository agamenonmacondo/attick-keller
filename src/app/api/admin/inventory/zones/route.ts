import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// GET /api/admin/inventory/zones — list all zones with description and sort_order
export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('table_zones')
    .select('id, name, description, sort_order')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ zones: data || [] })
}

// POST /api/admin/inventory/zones — create a new zone
export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { name, description, sort_order } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre de la zona es requerido' }, { status: 400 })
    }

    const sb = getServiceClient()
    const { data, error } = await sb
      .from('table_zones')
      .insert({
        restaurant_id: RESTAURANT_ID,
        name: name.trim(),
        description: description?.trim() || null,
        sort_order: typeof sort_order === 'number' ? sort_order : 999,
      })
      .select('id, name, description, sort_order')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ zone: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}

// PATCH /api/admin/inventory/zones — update a zone
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id, name, description, sort_order } = body

    if (!id) return NextResponse.json({ error: 'ID de zona requerido' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (sort_order !== undefined) updates.sort_order = sort_order

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const sb = getServiceClient()
    const { data, error } = await sb
      .from('table_zones')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)
      .select('id, name, description, sort_order')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 })
    return NextResponse.json({ zone: data })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}

// DELETE /api/admin/inventory/zones — delete a zone
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await request.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'ID de zona requerido' }, { status: 400 })

    const sb = getServiceClient()

    // Check if zone has tables
    const { count, error: countError } = await sb
      .from('tables')
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', id)
      .eq('restaurant_id', RESTAURANT_ID)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

    if (count && count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: la zona tiene ${count} mesa(s) asignada(s)` },
        { status: 409 }
      )
    }

    const { error } = await sb
      .from('table_zones')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}