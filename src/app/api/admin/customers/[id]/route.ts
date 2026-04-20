import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const sb = getServiceClient()

  const [customerRes, statsRes, visitsRes, reservationsRes] = await Promise.all([
    sb.from('customers').select('id, phone, email, full_name, preferences, notes, created_at').eq('id', id).eq('restaurant_id', RESTAURANT_ID).single(),
    sb.from('customer_stats').select('total_visits, total_spent, last_visit_date, no_show_count, is_recurring, loyalty_tier, updated_at').eq('customer_id', id).single(),
    sb.from('visit_history').select('id, visit_date, party_size, total_spent, feedback_rating, feedback_comment, no_show, created_at').eq('customer_id', id).order('visit_date', { ascending: false }).limit(20),
    sb.from('reservations').select('id, date, time_start, time_end, party_size, status, special_requests').eq('customer_id', id).order('date', { ascending: false }).limit(10),
  ])

  if (!customerRes.data) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    customer: customerRes.data,
    stats: statsRes.data || null,
    visits: visitsRes.data || [],
    reservations: reservationsRes.data || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const sb = getServiceClient()

  // Allow updating multiple customer fields
  const updates: Record<string, unknown> = {}
  if (typeof body.notes === 'string') updates.notes = body.notes
  if (typeof body.full_name === 'string') updates.full_name = body.full_name
  if (typeof body.phone === 'string' && body.phone.trim()) updates.phone = body.phone.trim()
  if (body.email !== undefined) updates.email = body.email || null
  if (body.preferences && typeof body.preferences === 'object') updates.preferences = body.preferences
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('customers')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', RESTAURANT_ID)
    .select('id, full_name, phone, email, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ customer: data })
}