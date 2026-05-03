import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

// PATCH /api/admin/inventory/tables/[id] — update a single table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params

  try {
    const body = await request.json()
    const allowedFields = ['number', 'capacity', 'capacity_min', 'name_attick', 'is_active', 'can_combine', 'combine_group', 'zone_id', 'sort_order']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const sb = getServiceClient()
    const { data, error } = await sb
      .from('tables')
      .update(updates)
      .eq('id', id)
      .eq('restaurant_id', RESTAURANT_ID)
      .select('*, zone:zone_id(name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })

    return NextResponse.json({ table: data })
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}

// DELETE /api/admin/inventory/tables/[id] — delete a table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  const { error } = await sb
    .from('tables')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
