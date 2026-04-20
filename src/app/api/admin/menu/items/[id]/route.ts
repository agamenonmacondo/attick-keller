import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.description === 'string') updates.description = body.description || null
  if (typeof body.price === 'number' && body.price >= 0) updates.price = body.price
  if (typeof body.category_id === 'string') updates.category_id = body.category_id
  if (typeof body.image_url === 'string') updates.image_url = body.image_url || null
  if (typeof body.is_featured === 'boolean') updates.is_featured = body.is_featured
  if (typeof body.is_available === 'boolean') updates.is_available = body.is_available
  if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 })

  return NextResponse.json({ item: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  // Soft delete: set is_available = false
  const { data, error } = await sb
    .from('menu_items')
    .update({ is_available: false })
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}