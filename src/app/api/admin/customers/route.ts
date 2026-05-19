import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

/** Sanitize a PostgREST ilike/like value to prevent injection */
function sanitizeLike(value: string): string {
  return value.replace(/[%_\\']/g, '\\$&')
}

/** Validate sort column whitelist */
const VALID_SORTS = ['created_at', 'full_name', 'phone', 'email'] as const
type ValidSort = typeof VALID_SORTS[number]

function validateSort(sort: string | null): ValidSort {
  if (sort && (VALID_SORTS as readonly string[]).includes(sort)) return sort as ValidSort
  return 'created_at'
}

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

    // Sort & order
    const sort = validateSort(searchParams.get('sort'))
    const order = searchParams.get('order') === 'asc' ? true : false // false = desc (default)

    // Step 1: Build base customers query with text/email filters
    let customersQuery = sb
      .from('customers')
      .select('id, full_name, phone, email, created_at', { count: 'exact' })
      .eq('restaurant_id', RESTAURANT_ID)

    if (q) {
      const safe = sanitizeLike(q)
      customersQuery = customersQuery.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
    }

    if (hasEmail === 'true') {
      customersQuery = customersQuery
        .not('email', 'is', null)
        .neq('email', '')
    } else if (hasEmail === 'false') {
      customersQuery = customersQuery
        .or('email.is.null,email.eq.""')
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
          const statsIds = new Set<string>((statsData || []).map((s: { customer_id: string }) => s.customer_id))
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
            const tagMatchIds = new Set<string>((tagData || []).map((t: { customer_id: string }) => t.customer_id))
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

    // Step 3: Paginate and fetch customers — sort on DB for created_at, client-side for name/phone/email
    let sortedCustomers: any[]
    let count: number | null

    if (sort === 'created_at') {
      // DB-level sort (reliable, no PostgREST prefix issue)
      const { data: customersData, count: dbCount, error: customersError } = await customersQuery
        .order('created_at', { ascending: order })
        .range(offset, offset + validLimit - 1)

      if (customersError) {
        console.error('[customers] Error fetching customers:', customersError.message, customersError.code)
        return NextResponse.json({ error: customersError.message, code: customersError.code }, { status: 500 })
      }

      sortedCustomers = customersData || []
      count = dbCount
    } else {
      // Client-side sort for name/phone/email (need all matching IDs, then sort + slice)
      // But we still paginate — fetch page then sort within it (acceptable for moderate page sizes)
      const { data: customersData, count: dbCount, error: customersError } = await customersQuery
        .range(offset, offset + validLimit - 1)

      if (customersError) {
        console.error('[customers] Error fetching customers:', customersError.message, customersError.code)
        return NextResponse.json({ error: customersError.message, code: customersError.code }, { status: 500 })
      }

      count = dbCount
      sortedCustomers = (customersData || []).sort((a: any, b: any) => {
        const va = (a[sort] || '').toString().toLowerCase()
        const vb = (b[sort] || '').toString().toLowerCase()
        return order ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }

    // Step 4: Fetch stats for the page of customers (non-critical)
    const customerIds = sortedCustomers.map((c: any) => c.id)
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
          statsData = Object.fromEntries(stats.map((s: Record<string, string | number | boolean | null>) => [s.customer_id as string, s]))
        }
      } catch (statsErr) {
        console.error('[customers] Stats fetch exception (non-critical, using defaults):', statsErr)
      }
    }

    // Step 5: Fetch tags for the page of customers (non-critical)
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

    const customers = sortedCustomers.map((c: any) => ({
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      created_at: c.created_at,
      total_visits: statsData[c.id]?.total_visits || 0,
      total_spent: statsData[c.id]?.total_spent || 0,
      last_visit_date: statsData[c.id]?.last_visit_date || null,
      loyalty_tier: statsData[c.id]?.loyalty_tier || 'bronze',
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
    const errorDetails = err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : { message: String(err), type: typeof err }
    console.error('[customers] FATAL GET error:', JSON.stringify(errorDetails))
    return NextResponse.json({ error: errorDetails.message, details: errorDetails }, { status: 500 })
  }
}