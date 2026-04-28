import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id: customerId } = await params
  const body = await request.json()
  const { tag_id } = body

  if (!tag_id) return NextResponse.json({ error: 'tag_id requerido' }, { status: 400 })

  const sb = getServiceClient()

  const { data: tag } = await sb
    .from('customer_tags')
    .select('id')
    .eq('id', tag_id)
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (!tag) return NextResponse.json({ error: 'Etiqueta no encontrada' }, { status: 404 })

  const { error } = await sb
    .from('customer_tag_links')
    .upsert({ customer_id: customerId, tag_id }, { onConflict: 'customer_id, tag_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id: customerId } = await params
  const sb = getServiceClient()

  const { data, error } = await sb
    .from('customer_tag_links')
    .select('tag_id, customer_tags!inner(id, name, color)')
    .eq('customer_id', customerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tags = (data || []).map((row: Record<string, unknown>) => {
    const ctArr = row.customer_tags as unknown as Array<{ id: string; name: string; color: string }> | null
    const ct = Array.isArray(ctArr) ? ctArr[0] : null
    return ct || { id: row.tag_id, name: 'Desconocida', color: '#6B2737' }
  })

  return NextResponse.json({ tags })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id: customerId } = await params
  const tagId = new URL(request.url).searchParams.get('tag_id')
  if (!tagId) return NextResponse.json({ error: 'tag_id requerido' }, { status: 400 })

  const sb = getServiceClient()
  const { error } = await sb
    .from('customer_tag_links')
    .delete()
    .eq('customer_id', customerId)
    .eq('tag_id', tagId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
