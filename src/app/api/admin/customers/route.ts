import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { full_name, phone, email } = body

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: 'Telefono requerido' }, { status: 400 })
  }

  const { data: existing } = await sb
    .from('customers')
    .select('id, full_name, phone, email')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('phone', phone.trim())
    .single()

  if (existing) {
    return NextResponse.json({ customer: existing }, { status: 200 })
  }

  const { data, error } = await sb
    .from('customers')
    .insert({
      restaurant_id: RESTAURANT_ID,
      phone: phone.trim(),
      email: email || null,
      full_name: full_name || null,
    })
    .select('id, full_name, phone, email')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un cliente con este telefono' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const sb = getServiceClient()

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25')), 100)
  const offset = (page - 1) * limit
  const sort = searchParams.get('sort') || 'created_at'
  const orderDir = searchParams.get('order') === 'asc' ? true : false
  const q = searchParams.get('q') || ''
  const tagIds = searchParams.get('tag_ids') || ''
  const hasEmail = searchParams.get('has_email') || ''
  const minVisits = parseInt(searchParams.get('min_visits') || '0')
  const lastVisitDays = parseInt(searchParams.get('last_visit_days') || '0')

  const sortMap: Record<string, string> = {
    created_at: 'customers.created_at',
    full_name: 'customers.full_name',
    total_visits: 'customer_stats.total_visits',
    last_visit_date: 'customer_stats.last_visit_date',
    loyalty_tier: 'customer_stats.loyalty_tier',
  }
  const sortColumn = sortMap[sort] || 'customers.created_at'

  // Build query — LEFT JOIN customer_stats para mostrar TODOS los clientes
  // incluso los que no tienen stats (nunca visitaron el restaurante)
  let query = sb
    .from('customers')
    .select('id, full_name, phone, email, created_at, customer_stats!left(total_visits, total_spent, last_visit_date, loyalty_tier, is_recurring)', { count: 'exact' })
    .eq('customers.restaurant_id', RESTAURANT_ID)
    .order(sortColumn, { ascending: orderDir })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }

  if (hasEmail === 'true') {
    query = query.not('email', 'is', null).neq('email', '')
  } else if (hasEmail === 'false') {
    query = query.or('email.is.null,email.eq.')
  }

  if (minVisits > 0) {
    query = query.gte('customer_stats.total_visits', minVisits)
  }

  if (lastVisitDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - lastVisitDays)
    query = query.gte('customer_stats.last_visit_date', cutoff.toISOString().split('T')[0])
  }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seen = new Set<string>()
  const customers = (data || [])
    .filter((c: Record<string, unknown>) => {
      if (seen.has(c.id as string)) return false
      seen.add(c.id as string)
      return true
    })
    .map((c: Record<string, unknown>) => {
      const statsArr = c.customer_stats as Record<string, unknown>[]
      const s = Array.isArray(statsArr) && statsArr.length > 0 ? statsArr[0] : {}
      return {
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        created_at: c.created_at,
        total_visits: (s.total_visits as number) || 0,
        total_spent: (s.total_spent as number) || 0,
        last_visit_date: s.last_visit_date || null,
        loyalty_tier: s.loyalty_tier || 'none',
        is_recurring: s.is_recurring || false,
        tag_ids: [] as string[],
      }
    })

  return NextResponse.json({
    customers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
