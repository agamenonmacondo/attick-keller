import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('customer_segments')
    .select('id, name, description, filters, created_at')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ segments: data || [] })
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { name, description, filters } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('customer_segments')
    .insert({
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      description: description || null,
      filters: filters || {},
    })
    .select('id, name, description, filters, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un segmento con este nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ segment: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const sb = getServiceClient()
  const { error } = await sb
    .from('customer_segments')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
