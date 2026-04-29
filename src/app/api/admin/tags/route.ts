import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('customer_tags')
    .select('id, name, color, description, sort_order, created_at')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    // Si la tabla no existe, devolver array vacio en lugar de error 500
    if (error.message && error.message.includes('does not exist')) {
      return NextResponse.json({ tags: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ tags: data || [] })
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { name, color, description } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('customer_tags')
    .insert({
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      color: color || '#6B2737',
      description: description || null,
    })
    .select('id, name, color, description, sort_order, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una etiqueta con este nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tag: data }, { status: 201 })
}
