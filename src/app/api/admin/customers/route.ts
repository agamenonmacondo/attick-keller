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

  // Check for existing customer with same phone
  const { data: existing } = await sb
    .from('customers')
    .select('id, full_name, phone, email')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('phone', phone.trim())
    .single()

  if (existing) {
    return NextResponse.json({ customer: existing }, { status: 200 })
  }

  // Create new customer
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
    // Handle unique constraint violation
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
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const dateField = searchParams.get('dateField') || 'created_at'

  const sb = getServiceClient()

  // Fetch customers with their stats via join
  let query = sb
    .from('customers')
    .select('id, full_name, phone, email, created_at, customer_stats(loyalty_tier, total_visits, last_visit_date)')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  if (from && to) {
    if (dateField === 'last_visit_date') {
      query = query.gte('customer_stats.last_visit_date', from).lte('customer_stats.last_visit_date', to)
    } else {
      query = query.gte('created_at', from).lte('created_at', to)
    }
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten the nested stats into the customer object
  const customers = (data || []).map((c: Record<string, unknown>) => {
    const stats = c.customer_stats as Record<string, unknown>[] | null
    const s = stats && stats.length > 0 ? stats[0] : {}
    return {
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      loyalty_tier: s.loyalty_tier || 'none',
      total_visits: s.total_visits || 0,
      last_visit_date: s.last_visit_date || null,
    }
  })

  return NextResponse.json({ customers })
}