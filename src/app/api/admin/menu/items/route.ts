import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { name, description, price, category_id, image_url, is_featured, sort_order } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }
  if (price === undefined || price === null || price < 0) {
    return NextResponse.json({ error: 'Precio requerido' }, { status: 400 })
  }
  if (!category_id) {
    return NextResponse.json({ error: 'Categoria requerida' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('menu_items')
    .insert({
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      description: description || null,
      price,
      category_id,
      image_url: image_url || null,
      is_featured: is_featured || false,
      is_available: true,
      sort_order: sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: data }, { status: 201 })
}