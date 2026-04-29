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
  try {
    // Debug: verificar variables de entorno
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('Env check:', { hasServiceKey, hasUrl, serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length })

    const admin = await getAdminUser(request)
    if (!admin) {
      console.log('No admin user found')
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    console.log('Admin user:', admin.email)

    const { searchParams } = new URL(request.url)
    const sb = getServiceClient()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25')), 100)
    const offset = (page - 1) * limit

    // Consulta SIMPLIFICADA sin filtros complejos
    const { data: customersData, count, error: customersError } = await sb
      .from('customers')
      .select('id, full_name, phone, email, created_at', { count: 'exact' })
      .eq('customers.restaurant_id', RESTAURANT_ID)
      .range(offset, offset + limit - 1)

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    console.log('Customers fetched:', customersData?.length || 0, 'count:', count)

    // Obtener customer_stats para los clientes obtenidos
    const customerIds = customersData?.map(c => c.id) || []
    let statsData: Record<string, any> = {}

    if (customerIds.length > 0) {
      const { data: stats, error: statsError } = await sb
        .from('customer_stats')
        .select('customer_id, total_visits, total_spent, last_visit_date, loyalty_tier, is_recurring')
        .in('customer_id', customerIds)

      if (statsError) {
        console.error('Error fetching stats:', statsError)
      } else if (stats) {
        statsData = Object.fromEntries(stats.map(s => [s.customer_id, s]))
        console.log('Stats fetched for', stats.length, 'customers')
      }
    }

    // Transformar respuesta
    const customers = (customersData || []).map(c => ({
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      created_at: c.created_at,
      total_visits: statsData[c.id]?.total_visits || 0,
      total_spent: statsData[c.id]?.total_spent || 0,
      last_visit_date: statsData[c.id]?.last_visit_date || null,
      loyalty_tier: statsData[c.id]?.loyalty_tier || 'none',
      is_recurring: statsData[c.id]?.is_recurring || false,
      tag_ids: [] as string[],
    }))

    console.log('Returning', customers.length, 'customers')

    return NextResponse.json({
      customers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err: unknown) {
    console.error('GET /api/admin/customers error:', err)
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
