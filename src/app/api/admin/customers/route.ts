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
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sb = getServiceClient()

    const page = parseInt(searchParams.get('page') || '1', 10)
    const validPage = isNaN(page) || page < 1 ? 1 : page
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const validLimit = isNaN(limit) || limit < 1 ? 25 : Math.min(limit, 100)
    const offset = (validPage - 1) * validLimit

    const q = searchParams.get('q') || ''
    const hasEmail = searchParams.get('has_email') || ''
    const minVisits = parseInt(searchParams.get('min_visits') || '0') || 0
    const lastVisitDays = parseInt(searchParams.get('last_visit_days') || '0') || 0
    const tagIds = searchParams.get('tag_ids') || ''

    // Step 1: Build base customers query with text/email filters
    let customersQuery = sb
      .from('customers')
      .select('id, full_name, phone, email, created_at', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)

    if (q) {
      customersQuery = customersQuery.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    }

    if (hasEmail === 'true') {
      customersQuery = customersQuery.not('email', 'is', null).neq('email', '')
    } else if (hasEmail === 'false') {
      customersQuery = customersQuery.or('email.is.null,email.eq.')
    }

    // Step 2: If filtering by stats or tags, resolve matching customer IDs first
    let filteredIds: Set<string> | null = null

    if (minVisits > 0 || lastVisitDays > 0) {
      let statsQuery = sb
        .from('customer_stats')
        .select('customer_id')
        .gte('total_visits', minVisits)

      if (lastVisitDays > 0) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - lastVisitDays)
        statsQuery = statsQuery.gte('last_visit_date', cutoff.toISOString().split('T')[0])
      }

      const { data: statsData, error: statsError } = await statsQuery

      if (statsError) {
        console.error('Error fetching customer_stats for filter:', statsError)
        return NextResponse.json({ error: `Error en customer_stats: ${statsError.message}` }, { status: 500 })
      }

      const statsIds = new Set((statsData || []).map((s: { customer_id: string }) => s.customer_id))
      filteredIds = filteredIds ? new Set([...filteredIds].filter(id => statsIds.has(id))) : statsIds
    }

    if (tagIds) {
      const ids = tagIds.split(',').filter(Boolean)
      if (ids.length > 0) {
        const { data: tagData, error: tagError } = await sb
          .from('customer_tag_links')
          .select('customer_id')
          .in('tag_id', ids)

        if (tagError) {
          console.error('Error fetching tag links for filter:', tagError)
          return NextResponse.json({ error: `Error en tags: ${tagError.message}` }, { status: 500 })
        }

        const tagMatchIds = new Set((tagData || []).map((t: { customer_id: string }) => t.customer_id))
        filteredIds = filteredIds ? new Set([...filteredIds].filter(id => tagMatchIds.has(id))) : tagMatchIds
      }
    }

    if (filteredIds !== null) {
      if (filteredIds.size === 0) {
        return NextResponse.json({
          customers: [],
          total: 0,
          page: validPage,
          limit: validLimit,
          totalPages: 0,
        })
      }
      customersQuery = customersQuery.in('id', [...filteredIds])
    }

    // Step 3: Paginate and fetch customers
    const { data: customersData, count, error: customersError } = await customersQuery
      .range(offset, offset + validLimit - 1)
      .order('created_at', { ascending: false })

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    // Step 4: Fetch stats for the page of customers
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
      }
    }

    // Step 5: Fetch tags for the page of customers
    let tagsByCustomer: Record<string, string[]> = {}
    if (customerIds.length > 0) {
      const { data: tagLinks, error: tagLinksError } = await sb
        .from('customer_tag_links')
        .select('customer_id, tag_id')
        .in('customer_id', customerIds)

      if (!tagLinksError && tagLinks) {
        tagsByCustomer = tagLinks.reduce((acc: Record<string, string[]>, link: { customer_id: string; tag_id: string }) => {
          if (!acc[link.customer_id]) acc[link.customer_id] = []
          acc[link.customer_id].push(link.tag_id)
          return acc
        }, {})
      }
    }

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
      tag_ids: tagsByCustomer[c.id] || [],
    }))

    return NextResponse.json({
      customers,
      total: count || 0,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil((count || 0) / validLimit),
    })
  } catch (err: unknown) {
    console.error('GET /api/admin/customers error:', err)
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}