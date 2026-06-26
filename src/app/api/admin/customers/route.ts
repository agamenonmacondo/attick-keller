import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'
import { sanitizeLike } from '@/lib/utils/sanitize'
import { handleApiError } from '@/lib/utils/api-security'

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sb = getServiceClient()
  const body = await request.json()
  const { full_name, phone, email } = body

  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: 'Telefono requerido' }, { status: 400 })
  }

  // Search customers with this phone (may return multiple — same phone, different names)
  const { data: existingCustomers } = await sb
    .from('customers')
    .select('id, full_name, phone, email')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('phone', phone.trim())

  if (existingCustomers && existingCustomers.length > 0) {
    // Try exact match by phone + name
    const nameMatch = full_name?.trim()
      ? existingCustomers.find(c => c.full_name?.toLowerCase() === full_name.trim().toLowerCase())
      : null

    if (nameMatch) {
      // Exact phone+name match — update email if provided
      const updates: Record<string, string> = {}
      if (email?.trim() && email.trim() !== nameMatch.email) {
        updates.email = email.trim()
      }
      if (Object.keys(updates).length > 0) {
        const { data: updated } = await sb
          .from('customers')
          .update(updates)
          .eq('id', nameMatch.id)
          .select('id, full_name, phone, email')
          .single()
        if (updated) return NextResponse.json({ customer: updated }, { status: 200 })
      }
      return NextResponse.json({ customer: nameMatch }, { status: 200 })
    }

    // Phone exists but name is different — create a new customer record
    // (two people can share the same phone number)
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
      // Unique constraint violation — same phone + name combo already exists
      return NextResponse.json({ error: 'Ya existe un cliente con este telefono y nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
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
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
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
    const visitsRange = searchParams.get('visits_range') || ''
    const isRecurring = searchParams.get('is_recurring') || ''
    const loyaltyTier = searchParams.get('loyalty_tier') || ''

    // Step 1: Build base customers query with text/email filters
    let customersQuery = sb
      .from('customers')
      .select('id, full_name, phone, email, created_at', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)

    if (q) {
      const safeQ = sanitizeLike(q)
      customersQuery = customersQuery.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%,email.ilike.%${safeQ}%`)
    }

    if (hasEmail === 'true') {
      // Filter customers that have a non-empty email
      customersQuery = customersQuery
        .not('email', 'is', null)
        .neq('email', '')
    } else if (hasEmail === 'false') {
      // Filter customers without email (null or empty string)
      customersQuery = customersQuery
        .or('email.is.null,email.eq.""')
    }

    // Step 2: If filtering by stats or tags, resolve matching customer IDs first
    let filteredIds: Set<string> | null = null

    const hasStatsFilters = minVisits > 0 || lastVisitDays > 0 || visitsRange || isRecurring || loyaltyTier

    if (hasStatsFilters) {
      try {
        let statsQuery = sb
          .from('customer_stats')
          .select('customer_id')

        if (minVisits > 0) {
          statsQuery = statsQuery.gte('total_visits', minVisits)
        }

        if (lastVisitDays > 0) {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - lastVisitDays)
          statsQuery = statsQuery.gte('last_visit_date', cutoff.toISOString().split('T')[0])
        }

        if (visitsRange) {
          const parts = visitsRange.split('-')
          const visitsMin = parseInt(parts[0], 10)
          if (!isNaN(visitsMin)) {
            statsQuery = statsQuery.gte('total_visits', visitsMin)
            if (parts[1] && parts[1] !== '+') {
              const visitsMax = parseInt(parts[1], 10)
              if (!isNaN(visitsMax)) {
                statsQuery = statsQuery.lte('total_visits', visitsMax)
              }
            }
          }
        }

        if (isRecurring === 'true') {
          statsQuery = statsQuery.eq('is_recurring', true)
        } else if (isRecurring === 'false') {
          statsQuery = statsQuery.eq('is_recurring', false)
        }

        if (loyaltyTier) {
          const tiers = loyaltyTier.split(',')
          if (tiers.length === 1) {
            statsQuery = statsQuery.eq('loyalty_tier', tiers[0])
          } else {
            statsQuery = statsQuery.in('loyalty_tier', tiers)
          }
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
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
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
    console.error('[customers] FATAL GET error:', err instanceof Error ? err.stack : String(err))
    return handleApiError(err, 'customers')
  }
}