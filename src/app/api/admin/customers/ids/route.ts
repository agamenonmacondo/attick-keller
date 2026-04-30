import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, getServiceClient, RESTAURANT_ID } from '@/lib/utils/admin-auth'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const sb = getServiceClient()

  const q = searchParams.get('q') || ''
  const tagIds = searchParams.get('tag_ids') || ''
  const hasEmail = searchParams.get('has_email') || ''
  const minVisits = parseInt(searchParams.get('min_visits') || '0') || 0
  const lastVisitDays = parseInt(searchParams.get('last_visit_days') || '0') || 0

  // Start with all customer IDs for this restaurant
  let customersQuery = sb
    .from('customers')
    .select('id')
    .eq('restaurant_id', RESTAURANT_ID)

  if (q) {
    customersQuery = customersQuery.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }

  if (hasEmail === 'true') {
    customersQuery = customersQuery.not('email', 'is', null).neq('email', '')
  } else if (hasEmail === 'false') {
    customersQuery = customersQuery.or('email.is.null,email.eq.')
  }

  // Filter by stats — resolve matching IDs from customer_stats first
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
      // Gracefully skip stats filter on error
      console.error('Error fetching customer_stats for ids, skipping stats filter:', statsError)
    } else {
      const statsIds = new Set((statsData || []).map((s: { customer_id: string }) => s.customer_id))
      if (statsIds.size === 0) {
        return NextResponse.json({ ids: [], total: 0 })
      }
      customersQuery = customersQuery.in('id', [...statsIds])
    }
  }

  // Filter by tags — resolve matching IDs from customer_tag_links
  if (tagIds) {
    const ids = tagIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      const { data: tagData, error: tagError } = await sb
        .from('customer_tag_links')
        .select('customer_id')
        .in('tag_id', ids)

      if (tagError) {
        // Gracefully skip tag filter on error — return all customers unfiltered by tags
        console.error('Error fetching tag links for ids, skipping tag filter:', tagError)
      } else {
        const tagMatchIds = new Set((tagData || []).map((t: { customer_id: string }) => t.customer_id))
        if (tagMatchIds.size === 0) {
          return NextResponse.json({ ids: [], total: 0 })
        }
        customersQuery = customersQuery.in('id', [...tagMatchIds])
      }
    }
  }

  const { data, error } = await customersQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (data || []).map((c: { id: string }) => c.id)

  return NextResponse.json({ ids, total: ids.length })
}