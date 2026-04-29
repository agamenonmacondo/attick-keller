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
  const minVisits = parseInt(searchParams.get('min_visits') || '0')
  const lastVisitDays = parseInt(searchParams.get('last_visit_days') || '0')

  // Build query
  let query = sb
    .from('customers')
    .select('id', { count: 'exact', head: false })
    .eq('customers.restaurant_id', RESTAURANT_ID)

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

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (data || []).map((c: { id: string }) => c.id)

  return NextResponse.json({ ids, total: ids.length })
}
