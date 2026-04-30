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
    // Step 0: Auth check with detailed logging
    let admin
    try {
      admin = await getAdminUser(request)
      if (!admin) {
        console.log('[customers] Auth failed - getAdminUser returned null')
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      console.log('[customers] Auth OK - admin:', admin.email, admin.role)
    } catch (authErr) {
      console.error('[customers] Auth exception:', authErr instanceof Error ? authErr.message : String(authErr))
      return NextResponse.json({ error: 'Auth error: ' + (authErr instanceof Error ? authErr.message : String(authErr)) }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const sb = getServiceClient()

    // Log env verification to diagnose truncated keys on Vercel
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    console.log('[customers] ENV check - URL:', sbUrl, 'SERVICE_KEY length:', sbKey.length, 'ANON_KEY length:', sbAnon.length)

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
      try {
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
          console.error('[customers] Stats filter error (skipping):', statsError.message, statsError.code)
        } else {
          const statsIds = new Set((statsData || []).map((s: { customer_id: string }) => s.customer_id))
          filteredIds = filteredIds ? new Set([...filteredIds].filter(id => statsIds.has(id))) : statsIds
        }
      } catch (statsErr) {
        console.error('[customers] Stats filter exception (skipping):', statsErr)
      }
    }

    if (tagIds) {
      const ids = tagIds.split(',').filter(Boolean)
      if (ids.length > 0) {
        try {
          const { data: tagData, error: tagError } = await sb
            .from('customer_tag_links')
            .select('customer_id')
            .in('tag_id', ids)

          if (tagError) {
            console.error('[customers] Tag filter error (skipping):', tagError.message, tagError.code)
          } else {
            const tagMatchIds = new Set((tagData || []).map((t: { customer_id: string }) => t.customer_id))
            filteredIds = filteredIds ? new Set([...filteredIds].filter(id => tagMatchIds.has(id))) : tagMatchIds
          }
        } catch (tagErr) {
          console.error('[customers] Tag filter exception (skipping):', tagErr)
        }
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
    // Sort client-side to avoid PostgREST "customers.created_at.desc" parse error
    // (SDK adds table prefix to .order() which breaks on some Supabase versions)
    const { data: customersData, count, error: customersError } = await customersQuery
      .range(offset, offset + validLimit - 1)

    if (customersError) {
      console.error('[customers] Error fetching customers:', customersError.message, customersError.code)
      return NextResponse.json({ error: customersError.message, code: customersError.code }, { status: 500 })
    }

    // Sort by created_at descending (client-side)
    const sortedCustomers = (customersData || []).sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )

    // Step 4: Fetch stats for the page of customers (non-critical, wrap in try-catch)
    const customerIds = customersData?.map(c => c.id) || []
    let statsData: Record<string, any> = {}

    if (customerIds.length > 0) {
      try {
        const { data: stats, error: statsError } = await sb
          .from('customer_stats')
          .select('customer_id, total_visits, total_spent, last_visit_date, loyalty_tier, is_recurring')
          .in('customer_id', customerIds)

        if (statsError) {
          console.error('[customers] Stats fetch error (non-critical, using defaults):', statsError.message, statsError.code)
        } else if (stats) {
          statsData = Object.fromEntries(stats.map(s => [s.customer_id, s]))
        }
      } catch (statsErr) {
        console.error('[customers] Stats fetch exception (non-critical, using defaults):', statsErr)
      }
    }

    // Step 5: Fetch tags for the page of customers (non-critical, wrap in try-catch)
    let tagsByCustomer: Record<string, string[]> = {}
    if (customerIds.length > 0) {
      try {
        const { data: tagLinks, error: tagLinksError } = await sb
          .from('customer_tag_links')
          .select('customer_id, tag_id')
          .in('customer_id', customerIds)

        if (tagLinksError) {
          console.error('[customers] Tag links fetch error (non-critical):', tagLinksError.message, tagLinksError.code)
        } else if (tagLinks) {
          tagsByCustomer = tagLinks.reduce((acc: Record<string, string[]>, link: { customer_id: string; tag_id: string }) => {
            if (!acc[link.customer_id]) acc[link.customer_id] = []
            acc[link.customer_id].push(link.tag_id)
            return acc
          }, {})
        }
      } catch (tagErr) {
        console.error('[customers] Tag links fetch exception (non-critical):', tagErr)
      }
    }

    const customers = sortedCustomers.map(c => ({
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
    // Enhanced error logging — include full details so Vercel logs show the root cause
    const errorDetails = err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : { message: String(err), type: typeof err }
    console.error('[customers] FATAL GET error:', JSON.stringify(errorDetails))
    return NextResponse.json({ error: errorDetails.message, details: errorDetails }, { status: 500 })
  }
}